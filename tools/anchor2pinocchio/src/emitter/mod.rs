//! Emit Pinocchio code from IR

use anyhow::Result;
use std::path::Path;
use std::fs;

use crate::ir::*;

pub fn emit(program: &PinocchioProgram, output_dir: &Path) -> Result<()> {
    fs::create_dir_all(output_dir)?;

    // Emit Cargo.toml
    emit_cargo_toml(program, output_dir)?;

    // Emit src/lib.rs
    let src_dir = output_dir.join("src");
    fs::create_dir_all(&src_dir)?;
    emit_lib_rs(program, &src_dir)?;

    // Emit src/state.rs
    emit_state_rs(program, &src_dir)?;

    // Emit src/error.rs
    emit_error_rs(program, &src_dir)?;

    // Emit src/instructions/
    emit_instructions(program, &src_dir)?;

    Ok(())
}

fn emit_cargo_toml(program: &PinocchioProgram, output_dir: &Path) -> Result<()> {
    let content = format!(r#"[package]
name = "{}"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]

[features]
no-entrypoint = []
cpi = ["no-entrypoint"]

[dependencies]
pinocchio = "0.7"
{}

[profile.release]
overflow-checks = true
lto = "fat"
codegen-units = 1
opt-level = "z"  # Optimize for size
strip = true
"#,
        program.name,
        if program.config.no_alloc { "" } else { "pinocchio-token = \"0.3\"" }
    );

    fs::write(output_dir.join("Cargo.toml"), content)?;
    Ok(())
}

fn emit_lib_rs(program: &PinocchioProgram, src_dir: &Path) -> Result<()> {
    let mut content = String::new();

    content.push_str("#![allow(unexpected_cfgs)]\n\n");

    // Header
    if program.config.no_alloc {
        content.push_str("#![no_std]\n\n");
    }

    content.push_str("use pinocchio::{\n");
    content.push_str("    account_info::AccountInfo,\n");
    content.push_str("    program_error::ProgramError,\n");
    content.push_str("    pubkey::Pubkey,\n");
    content.push_str("    ProgramResult,\n");
    content.push_str("};\n\n");

    // Modules
    content.push_str("mod state;\n");
    content.push_str("mod error;\n");
    content.push_str("mod instructions;\n\n");

    content.push_str("pub use state::*;\n");
    content.push_str("pub use error::*;\n\n");

    // Program ID as bytes (Pinocchio uses [u8; 32])
    if let Some(id) = &program.program_id {
        content.push_str(&format!(
            "/// Program ID: {}\n",
            id
        ));
        content.push_str("pub const ID: [u8; 32] = [\n");
        // Decode base58 to bytes
        if let Ok(bytes) = bs58_decode(id) {
            for chunk in bytes.chunks(8) {
                content.push_str("    ");
                for b in chunk {
                    content.push_str(&format!("{:#04x}, ", b));
                }
                content.push_str("\n");
            }
        } else {
            content.push_str("    0; 32 // TODO: Decode program ID\n");
        }
        content.push_str("];\n\n");
    }

    // Entrypoint - import the macro properly
    content.push_str("#[cfg(not(feature = \"no-entrypoint\"))]\n");
    content.push_str("use pinocchio::entrypoint;\n");
    content.push_str("#[cfg(not(feature = \"no-entrypoint\"))]\n");
    content.push_str("entrypoint!(process_instruction);\n\n");

    // Allocator
    if program.config.no_alloc {
        content.push_str("pinocchio::no_allocator!();\n");
        content.push_str("pinocchio::no_panic_handler!();\n\n");
    }

    // Discriminator constants
    content.push_str("// Instruction discriminators (Anchor-compatible)\n");
    for inst in &program.instructions {
        let disc_bytes: Vec<String> = inst.discriminator.iter()
            .map(|b| format!("{:#04x}", b))
            .collect();
        content.push_str(&format!(
            "const {}_DISC: [u8; 8] = [{}];\n",
            to_screaming_snake_str(&inst.name),
            disc_bytes.join(", ")
        ));
    }
    content.push_str("\n");

    // Main dispatch function
    content.push_str("pub fn process_instruction(\n");
    content.push_str("    program_id: &Pubkey,\n");
    content.push_str("    accounts: &[AccountInfo],\n");
    content.push_str("    instruction_data: &[u8],\n");
    content.push_str(") -> ProgramResult {\n");
    content.push_str("    if instruction_data.len() < 8 {\n");
    content.push_str("        return Err(ProgramError::InvalidInstructionData);\n");
    content.push_str("    }\n\n");

    content.push_str("    let (disc, data) = instruction_data.split_at(8);\n");
    content.push_str("    let disc: [u8; 8] = disc.try_into().unwrap();\n\n");

    content.push_str("    match disc {\n");

    for inst in &program.instructions {
        content.push_str(&format!(
            "        {}_DISC => instructions::{}(program_id, accounts, data),\n",
            to_screaming_snake_str(&inst.name),
            inst.name
        ));
    }

    content.push_str("        _ => Err(ProgramError::InvalidInstructionData),\n");
    content.push_str("    }\n");
    content.push_str("}\n");

    fs::write(src_dir.join("lib.rs"), content)?;
    Ok(())
}

fn to_screaming_snake_str(s: &str) -> String {
    let mut result = String::new();
    for (i, c) in s.chars().enumerate() {
        if c.is_uppercase() && i > 0 {
            result.push('_');
        }
        result.push(c.to_uppercase().next().unwrap());
    }
    result
}

fn bs58_decode(s: &str) -> Result<Vec<u8>> {
    // Simple base58 decode for Solana addresses
    const ALPHABET: &[u8] = b"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

    let mut result: Vec<u8> = vec![0; 32];
    let mut scratch: Vec<u64> = vec![0; 44]; // Enough for 32 bytes

    for c in s.bytes() {
        let mut val = ALPHABET.iter().position(|&x| x == c)
            .ok_or_else(|| anyhow::anyhow!("Invalid base58 character"))? as u64;

        for digit in scratch.iter_mut() {
            val += *digit * 58;
            *digit = val & 0xFF;
            val >>= 8;
        }
    }

    // Convert scratch to result
    for (i, &b) in scratch.iter().take(32).enumerate() {
        result[31 - i] = b as u8;
    }

    // Handle leading zeros
    let leading_zeros = s.bytes().take_while(|&c| c == b'1').count();
    for i in 0..leading_zeros {
        result[i] = 0;
    }

    Ok(result)
}

fn emit_state_rs(program: &PinocchioProgram, src_dir: &Path) -> Result<()> {
    let mut content = String::new();

    content.push_str("use pinocchio::{account_info::AccountInfo, program_error::ProgramError};\n\n");

    for state in &program.state_structs {
        // Struct definition
        content.push_str("#[repr(C)]\n");
        content.push_str("#[derive(Clone, Copy)]\n");
        content.push_str(&format!("pub struct {} {{\n", state.name));

        for field in &state.fields {
            content.push_str(&format!("    pub {}: {},\n", field.name, field.ty));
        }

        content.push_str("}\n\n");

        // Impl block
        content.push_str(&format!("impl {} {{\n", state.name));
        content.push_str(&format!("    pub const SIZE: usize = {};\n\n", state.size));

        // from_account_info
        content.push_str("    #[inline(always)]\n");
        content.push_str("    pub fn from_account_info(info: &AccountInfo) -> Result<&Self, ProgramError> {\n");
        content.push_str("        let data = info.try_borrow_data()?;\n");
        content.push_str(&format!("        if data.len() < 8 + Self::SIZE {{\n"));
        content.push_str("            return Err(ProgramError::InvalidAccountData);\n");
        content.push_str("        }\n");
        content.push_str("        // Skip 8-byte discriminator\n");
        content.push_str("        Ok(unsafe { &*(data[8..].as_ptr() as *const Self) })\n");
        content.push_str("    }\n\n");

        // from_account_info_mut
        content.push_str("    #[inline(always)]\n");
        content.push_str("    pub fn from_account_info_mut(info: &AccountInfo) -> Result<&mut Self, ProgramError> {\n");
        content.push_str("        let mut data = info.try_borrow_mut_data()?;\n");
        content.push_str(&format!("        if data.len() < 8 + Self::SIZE {{\n"));
        content.push_str("            return Err(ProgramError::InvalidAccountData);\n");
        content.push_str("        }\n");
        content.push_str("        Ok(unsafe { &mut *(data[8..].as_mut_ptr() as *mut Self) })\n");
        content.push_str("    }\n");

        content.push_str("}\n\n");
    }

    fs::write(src_dir.join("state.rs"), content)?;
    Ok(())
}

fn emit_error_rs(program: &PinocchioProgram, src_dir: &Path) -> Result<()> {
    let mut content = String::new();

    content.push_str("use pinocchio::program_error::ProgramError;\n\n");

    content.push_str("#[repr(u32)]\n");
    content.push_str("#[derive(Clone, Copy, Debug)]\n");
    content.push_str("pub enum Error {\n");

    for error in &program.errors {
        content.push_str(&format!("    /// {}\n", error.msg));
        content.push_str(&format!("    {} = {},\n", error.name, error.code));
    }

    content.push_str("}\n\n");

    // Impl From<Error> for ProgramError
    content.push_str("impl From<Error> for ProgramError {\n");
    content.push_str("    fn from(e: Error) -> Self {\n");
    content.push_str("        ProgramError::Custom(e as u32)\n");
    content.push_str("    }\n");
    content.push_str("}\n");

    fs::write(src_dir.join("error.rs"), content)?;
    Ok(())
}

fn emit_instructions(program: &PinocchioProgram, src_dir: &Path) -> Result<()> {
    let inst_dir = src_dir.join("instructions");
    fs::create_dir_all(&inst_dir)?;

    // mod.rs
    let mut mod_content = String::new();
    for inst in &program.instructions {
        mod_content.push_str(&format!("mod {};\n", inst.name));
    }
    mod_content.push_str("\n");
    for inst in &program.instructions {
        mod_content.push_str(&format!("pub use {}::{};\n", inst.name, inst.name));
    }

    fs::write(inst_dir.join("mod.rs"), mod_content)?;

    // Individual instruction files
    for inst in &program.instructions {
        emit_instruction(inst, program, &inst_dir)?;
    }

    Ok(())
}

fn emit_instruction(
    inst: &PinocchioInstruction,
    program: &PinocchioProgram,
    inst_dir: &Path,
) -> Result<()> {
    let mut content = String::new();

    content.push_str("#![allow(unused_variables, unused_imports)]\n\n");
    content.push_str("use pinocchio::{\n");
    content.push_str("    account_info::AccountInfo,\n");
    content.push_str("    program_error::ProgramError,\n");
    content.push_str("    pubkey::Pubkey,\n");
    content.push_str("    ProgramResult,\n");
    content.push_str("    sysvars::{clock::Clock, Sysvar},\n");
    content.push_str("};\n");

    // Add pinocchio_token if the instruction uses token operations
    if inst.body.contains("token::") || inst.body.contains("Transfer") ||
       inst.body.contains("mint_to") || inst.body.contains("burn") {
        content.push_str("use pinocchio_token::instructions::{Transfer, MintTo, Burn};\n");
    }
    content.push_str("\n");

    content.push_str("use crate::error::Error;\n");

    // Import state structs if referenced
    for state in &program.state_structs {
        if inst.body.contains(&state.name) {
            content.push_str(&format!("use crate::state::{};\n", state.name));
        }
    }
    content.push_str("\n");

    // Account indices as constants for clarity
    if !inst.accounts.is_empty() {
        content.push_str("// Account indices\n");
        for acc in &inst.accounts {
            content.push_str(&format!(
                "const {}: usize = {};\n",
                to_screaming_snake(&acc.name),
                acc.index
            ));
        }
        content.push_str("\n");
    }

    // Function signature
    content.push_str(&format!(
        "pub fn {}(\n    program_id: &Pubkey,\n    accounts: &[AccountInfo],\n    data: &[u8],\n) -> ProgramResult {{\n",
        inst.name
    ));

    if inst.accounts.is_empty() {
        content.push_str("    // No accounts required\n");
        content.push_str("    Ok(())\n");
        content.push_str("}\n");
        fs::write(inst_dir.join(format!("{}.rs", inst.name)), content)?;
        return Ok(());
    }

    // Account validation
    content.push_str(&format!(
        "    // Validate account count\n    if accounts.len() < {} {{\n        return Err(ProgramError::NotEnoughAccountKeys);\n    }}\n\n",
        inst.accounts.len()
    ));

    // Get account references with better naming
    content.push_str("    // Get accounts\n");
    for acc in &inst.accounts {
        content.push_str(&format!(
            "    let {} = &accounts[{}];\n",
            acc.name,
            to_screaming_snake(&acc.name)
        ));
    }
    content.push_str("\n");

    // Emit validations
    let mut has_validations = false;
    for validation in &inst.validations {
        match validation {
            Validation::IsSigner { account_idx } => {
                if !has_validations {
                    content.push_str("    // Validate accounts\n");
                    has_validations = true;
                }
                let acc = &inst.accounts[*account_idx];
                content.push_str(&format!(
                    "    if !{}.is_signer() {{\n        return Err(ProgramError::MissingRequiredSignature);\n    }}\n",
                    acc.name
                ));
            }
            Validation::IsWritable { account_idx } => {
                if !has_validations {
                    content.push_str("    // Validate accounts\n");
                    has_validations = true;
                }
                let acc = &inst.accounts[*account_idx];
                content.push_str(&format!(
                    "    if !{}.is_writable() {{\n        return Err(ProgramError::Immutable);\n    }}\n",
                    acc.name
                ));
            }
            Validation::PdaCheck { account_idx, seeds, bump: _ } => {
                if !has_validations {
                    content.push_str("    // Validate accounts\n");
                    has_validations = true;
                }
                let acc = &inst.accounts[*account_idx];
                // Generate PDA validation
                let seeds_code: Vec<String> = seeds.iter()
                    .map(|s| {
                        if s.starts_with("b\"") {
                            s.clone()
                        } else if s.contains(".key()") {
                            format!("{}.as_ref()", s.replace(".key()", "").replace(".as_ref()", ""))
                        } else {
                            format!("&{}", s)
                        }
                    })
                    .collect();
                content.push_str(&format!(
                    "    // TODO: Verify PDA for {} with seeds: [{}]\n",
                    acc.name,
                    seeds_code.join(", ")
                ));
            }
            Validation::Custom { code } => {
                if !has_validations {
                    content.push_str("    // Validate accounts\n");
                    has_validations = true;
                }
                content.push_str(&format!("    {}\n", code));
            }
            _ => {}
        }
    }

    if has_validations {
        content.push_str("\n");
    }

    // Parse instruction arguments if any
    if !inst.args.is_empty() {
        content.push_str("    // Parse instruction arguments\n");

        let mut offset = 0usize;
        for arg in &inst.args {
            let (size, parse_code) = get_arg_parse_code(&arg.ty, offset, &arg.name);
            content.push_str(&format!("    {}\n", parse_code));
            offset += size;
        }
        content.push_str("\n");
    }

    // Add transformed body or placeholder
    let body_ends_with_ok = inst.body.trim().ends_with("Ok (())")
        || inst.body.trim().ends_with("Ok(())");

    if !inst.body.is_empty() && inst.body != "{}" {
        content.push_str("    // Transformed instruction logic\n");
        // Add the transformed body (will have some TODO markers)
        for line in inst.body.lines() {
            let trimmed = line.trim();
            if !trimmed.is_empty() {
                // Skip duplicate Ok(()) if body already has it
                if body_ends_with_ok && (trimmed == "Ok (())" || trimmed == "Ok(())") {
                    continue;
                }
                content.push_str(&format!("    {}\n", trimmed));
            }
        }
    } else {
        content.push_str("    // TODO: Implement instruction logic\n");
    }

    // Only add Ok(()) if body doesn't already have it
    if !body_ends_with_ok {
        content.push_str("\n    Ok(())\n");
    } else {
        content.push_str("    Ok(())\n");
    }
    content.push_str("}\n");

    fs::write(inst_dir.join(format!("{}.rs", inst.name)), content)?;
    Ok(())
}

fn to_screaming_snake(s: &str) -> String {
    let mut result = String::new();
    for (i, c) in s.chars().enumerate() {
        if c.is_uppercase() && i > 0 {
            result.push('_');
        }
        result.push(c.to_uppercase().next().unwrap());
    }
    result
}

/// Returns (size, parse_code) for a given type
fn get_arg_parse_code(ty: &str, offset: usize, name: &str) -> (usize, String) {
    let ty_clean = ty.replace(" ", "").to_lowercase();

    match ty_clean.as_str() {
        "u8" => (1, format!(
            "let {} = data.get({}).copied().ok_or(ProgramError::InvalidInstructionData)?;",
            name, offset
        )),
        "i8" => (1, format!(
            "let {} = data.get({}).map(|&b| b as i8).ok_or(ProgramError::InvalidInstructionData)?;",
            name, offset
        )),
        "u16" => (2, format!(
            "let {} = u16::from_le_bytes(data.get({}..{}).ok_or(ProgramError::InvalidInstructionData)?.try_into().unwrap());",
            name, offset, offset + 2
        )),
        "i16" => (2, format!(
            "let {} = i16::from_le_bytes(data.get({}..{}).ok_or(ProgramError::InvalidInstructionData)?.try_into().unwrap());",
            name, offset, offset + 2
        )),
        "u32" => (4, format!(
            "let {} = u32::from_le_bytes(data.get({}..{}).ok_or(ProgramError::InvalidInstructionData)?.try_into().unwrap());",
            name, offset, offset + 4
        )),
        "i32" => (4, format!(
            "let {} = i32::from_le_bytes(data.get({}..{}).ok_or(ProgramError::InvalidInstructionData)?.try_into().unwrap());",
            name, offset, offset + 4
        )),
        "u64" => (8, format!(
            "let {} = u64::from_le_bytes(data.get({}..{}).ok_or(ProgramError::InvalidInstructionData)?.try_into().unwrap());",
            name, offset, offset + 8
        )),
        "i64" => (8, format!(
            "let {} = i64::from_le_bytes(data.get({}..{}).ok_or(ProgramError::InvalidInstructionData)?.try_into().unwrap());",
            name, offset, offset + 8
        )),
        "u128" => (16, format!(
            "let {} = u128::from_le_bytes(data.get({}..{}).ok_or(ProgramError::InvalidInstructionData)?.try_into().unwrap());",
            name, offset, offset + 16
        )),
        "i128" => (16, format!(
            "let {} = i128::from_le_bytes(data.get({}..{}).ok_or(ProgramError::InvalidInstructionData)?.try_into().unwrap());",
            name, offset, offset + 16
        )),
        "bool" => (1, format!(
            "let {} = data.get({}).copied().ok_or(ProgramError::InvalidInstructionData)? != 0;",
            name, offset
        )),
        "pubkey" => (32, format!(
            "let {}: &[u8; 32] = data.get({}..{}).ok_or(ProgramError::InvalidInstructionData)?.try_into().unwrap();",
            name, offset, offset + 32
        )),
        _ => {
            // Default: assume it's a custom struct or unknown type
            (0, format!("// TODO: Parse {} of type {} at offset {}", name, ty, offset))
        }
    }
}

/// Generate code for PDA verification
fn generate_pda_verification(seeds: &[String], bump_name: Option<&str>, account_name: &str) -> String {
    let seeds_code: Vec<String> = seeds.iter().map(|s| {
        if s.starts_with("b\"") {
            // Literal bytes
            s.clone()
        } else if s.contains(".key()") {
            // Account key reference
            format!("{}.as_ref()", s.replace(".key()", "").replace(".as_ref()", ""))
        } else {
            // Variable reference
            format!("{}.as_ref()", s)
        }
    }).collect();

    let bump_code = bump_name.map(|b| format!(", &[{}]", b)).unwrap_or_default();

    format!(
        r#"// Verify PDA for {}
    let (expected_{}, expected_{}_bump) = Pubkey::find_program_address(
        &[{}{}],
        program_id,
    );
    if {}.key() != &expected_{} {{
        return Err(ProgramError::InvalidSeeds);
    }}"#,
        account_name,
        account_name, account_name,
        seeds_code.join(", "), bump_code,
        account_name, account_name
    )
}
