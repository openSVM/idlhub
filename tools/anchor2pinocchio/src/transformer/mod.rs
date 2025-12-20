//! Transform Anchor IR to Pinocchio IR

use anyhow::Result;
use crate::ir::*;

pub struct Config {
    pub no_alloc: bool,
    pub lazy_entrypoint: bool,
    pub inline_cpi: bool,
    pub anchor_compat: bool,
}

pub fn transform(
    anchor: &AnchorProgram,
    analysis: &ProgramAnalysis,
    config: &Config,
) -> Result<PinocchioProgram> {
    let instructions = anchor.instructions.iter()
        .map(|inst| transform_instruction(inst, anchor, analysis, config))
        .collect::<Result<Vec<_>>>()?;

    let state_structs = anchor.state_structs.iter()
        .map(|state| transform_state(state, analysis))
        .collect::<Result<Vec<_>>>()?;

    let errors = transform_errors(&anchor.errors);

    Ok(PinocchioProgram {
        name: anchor.name.clone(),
        program_id: anchor.program_id.clone(),
        config: PinocchioConfig {
            no_alloc: config.no_alloc,
            lazy_entrypoint: config.lazy_entrypoint,
            anchor_compat: config.anchor_compat,
        },
        instructions,
        state_structs,
        errors,
    })
}

fn transform_instruction(
    anchor_inst: &AnchorInstruction,
    program: &AnchorProgram,
    analysis: &ProgramAnalysis,
    config: &Config,
) -> Result<PinocchioInstruction> {
    // Find the corresponding account struct
    let account_struct = program.account_structs.iter()
        .find(|s| s.name == anchor_inst.accounts_struct)
        .cloned()
        .unwrap_or_else(|| AnchorAccountStruct {
            name: anchor_inst.accounts_struct.clone(),
            instruction_args: Vec::new(),
            accounts: Vec::new(),
        });

    // Generate discriminator
    let discriminator = if config.anchor_compat {
        // Anchor-style: sha256("global:{name}")[0..8]
        anchor_discriminator(&anchor_inst.name)
    } else {
        // Simple sequential
        vec![0u8; 8]
    };

    // Transform accounts
    let accounts: Vec<PinocchioAccount> = account_struct.accounts.iter()
        .enumerate()
        .map(|(idx, acc)| transform_account(acc, idx, analysis))
        .collect();

    // Generate validations
    let validations = generate_validations(&account_struct, analysis);

    // Transform body (replace Anchor patterns with Pinocchio)
    let body = transform_body(&anchor_inst.body, &accounts, config);

    Ok(PinocchioInstruction {
        name: anchor_inst.name.clone(),
        discriminator,
        accounts,
        args: anchor_inst.args.clone(),
        validations,
        body,
    })
}

fn transform_account(
    anchor_acc: &AnchorAccount,
    index: usize,
    analysis: &ProgramAnalysis,
) -> PinocchioAccount {
    let is_signer = matches!(anchor_acc.ty, AccountType::Signer);
    let is_writable = anchor_acc.constraints.iter()
        .any(|c| matches!(c, AccountConstraint::Mut | AccountConstraint::Init { .. }));

    let pda_info = analysis.pdas.iter()
        .find(|p| p.account_name == anchor_acc.name);

    PinocchioAccount {
        name: anchor_acc.name.clone(),
        index,
        is_signer,
        is_writable,
        is_pda: pda_info.is_some(),
        pda_seeds: pda_info.map(|p| p.seeds.clone()),
    }
}

fn generate_validations(
    account_struct: &AnchorAccountStruct,
    analysis: &ProgramAnalysis,
) -> Vec<Validation> {
    let mut validations = Vec::new();

    for (idx, account) in account_struct.accounts.iter().enumerate() {
        // Signer check
        if matches!(account.ty, AccountType::Signer) {
            validations.push(Validation::IsSigner { account_idx: idx });
        }

        // Writable check for mut accounts
        if account.constraints.iter().any(|c| matches!(c, AccountConstraint::Mut)) {
            validations.push(Validation::IsWritable { account_idx: idx });
        }

        // PDA check
        for constraint in &account.constraints {
            if let AccountConstraint::Seeds(seeds) = constraint {
                let bump = account.constraints.iter()
                    .find_map(|c| match c {
                        AccountConstraint::Bump(b) => Some(b.clone()),
                        _ => None,
                    })
                    .flatten();

                validations.push(Validation::PdaCheck {
                    account_idx: idx,
                    seeds: seeds.clone(),
                    bump,
                });
            }

            // Custom constraint - skip for now as they need manual review
            if let AccountConstraint::Constraint { expr, error } = constraint {
                // Constraints are complex and need manual conversion
                // Just add as comment
                validations.push(Validation::Custom {
                    code: format!(
                        "// TODO: Verify constraint: {} @ {:?}",
                        expr.replace('\n', " ").replace("  ", " "),
                        error
                    ),
                });
            }
        }
    }

    validations
}

fn transform_constraint_expr(expr: &str, accounts: &[AnchorAccount]) -> String {
    let mut result = expr.to_string();

    // Replace account references
    for (idx, acc) in accounts.iter().enumerate() {
        // Replace acc.key() with accounts[idx].key()
        result = result.replace(
            &format!("{}.key()", acc.name),
            &format!("accounts[{}].key()", idx)
        );

        // Replace acc.field with dereferenced access
        // This is simplified - real implementation needs type info
    }

    result
}

fn transform_body(body: &str, accounts: &[PinocchioAccount], config: &Config) -> String {
    let mut result = body.to_string();

    // Strip outer braces if present
    let trimmed = result.trim();
    if trimmed.starts_with('{') && trimmed.ends_with('}') {
        result = trimmed[1..trimmed.len()-1].to_string();
    }

    // Replace ctx.accounts.X with actual account variables
    // Sort by name length (longest first) to avoid partial matches
    let mut sorted_accounts: Vec<_> = accounts.iter().collect();
    sorted_accounts.sort_by(|a, b| b.name.len().cmp(&a.name.len()));

    for acc in &sorted_accounts {
        // Replace all ctx.accounts.X patterns
        // This handles ctx.accounts.pool.field, ctx.accounts.pool.method(), etc.
        let anchor_prefix = format!("ctx . accounts . {}", acc.name);
        let anchor_prefix_compact = format!("ctx.accounts.{}", acc.name);

        // Handle spaced version first (from tokenization)
        result = result.replace(&anchor_prefix, &acc.name);
        // Handle compact version
        result = result.replace(&anchor_prefix_compact, &acc.name);
    }

    // Also handle any remaining ctx.accounts references generically
    result = result.replace("ctx . accounts . ", "");
    result = result.replace("ctx.accounts.", "");

    // Replace ctx.bumps.X with bump variables
    for acc in accounts {
        if acc.is_pda {
            result = result.replace(
                &format!("ctx.bumps.{}", acc.name),
                &format!("{}_bump", acc.name)
            );
        }
    }

    // Replace ctx.program_id with program_id
    result = result.replace("ctx.program_id", "program_id");

    // Transform state access patterns
    result = transform_state_access(&result, accounts);

    // Replace CPI patterns
    if config.inline_cpi {
        result = inline_cpi_calls(&result);
    } else {
        result = transform_cpi_calls(&result);
    }

    // Replace require! macro
    result = transform_require_macro(&result);

    // Replace require_keys_eq! macro
    result = transform_require_keys_eq(&result);

    // Replace msg! macro with pinocchio log
    result = result.replace("msg!(", "pinocchio::log::sol_log(");

    // Replace Clock::get()? with Clock::get()
    result = result.replace("Clock::get()?", "Clock::get()");

    // Replace anchor error types
    result = result.replace("anchor_lang::error::Error", "ProgramError");
    result = result.replace("anchor_lang::error!", "return Err(");

    // Replace program-specific error enum names with generic Error
    // Common Anchor error naming conventions (with and without spaces)
    result = result.replace("StableSwapError :: ", "Error::");
    result = result.replace("StableSwapError::", "Error::");
    result = result.replace("ProtocolError :: ", "Error::");
    result = result.replace("ProtocolError::", "Error::");
    result = result.replace("ProgramError :: ", "Error::");
    result = result.replace("ProgramError::", "Error::");

    // Replace emit! macro (events)
    result = transform_emit_macro(&result);

    // Clean up the entire body
    result = clean_spaces(&result);

    // Split into proper statements
    result = format_body_statements(&result);

    result
}

/// Format body into proper Rust statements
fn format_body_statements(body: &str) -> String {
    let mut result = String::new();
    let mut current = String::new();
    let mut depth = 0;

    for c in body.chars() {
        current.push(c);
        match c {
            '{' => depth += 1,
            '}' => {
                depth -= 1;
                if depth == 0 && !current.trim().is_empty() {
                    result.push_str(&current.trim());
                    result.push('\n');
                    current.clear();
                }
            }
            ';' if depth == 0 => {
                result.push_str(current.trim());
                result.push('\n');
                current.clear();
            }
            _ => {}
        }
    }

    if !current.trim().is_empty() {
        result.push_str(current.trim());
    }

    result
}

/// Transform state access like `pool.load_mut()` or `pool.authority`
fn transform_state_access(body: &str, accounts: &[PinocchioAccount]) -> String {
    let mut result = body.to_string();

    // Replace .load_mut()? with ::from_account_info_mut()?
    for acc in accounts {
        // Pattern: account.load_mut()?
        result = result.replace(
            &format!("{}.load_mut()?", acc.name),
            &format!("// Access {} as mutable\n    let {}_data = {}::from_account_info_mut(&{})?", acc.name, acc.name, get_state_type(&acc.name), acc.name)
        );
        // Pattern: account.load()?
        result = result.replace(
            &format!("{}.load()?", acc.name),
            &format!("// Access {} as readonly\n    let {}_data = {}::from_account_info(&{})?", acc.name, acc.name, get_state_type(&acc.name), acc.name)
        );
    }

    // Add comments for accounts that need state access
    // These patterns suggest the instruction body is accessing state fields
    let state_accounts = ["pool", "farming_period", "user_position", "stake_position"];
    for acc in &state_accounts {
        // Check if body references acc.field_name patterns
        let pattern = format!("{}.", acc);
        if result.contains(&pattern) {
            // Insert state access at the beginning if not already present
            let state_type = get_state_type(acc);
            let access_line = format!(
                "    // NOTE: Deserialize {} state from account\n    \
                // let {}_state = {}::from_account_info_mut(&{})?;\n    \
                // Then use {}_state.field instead of {}.field\n",
                acc, acc, state_type, acc, acc, acc
            );
            if !result.contains(&access_line) {
                result = format!("{}{}", access_line, result);
            }
        }
    }

    result
}

/// Guess state type from account name
fn get_state_type(account_name: &str) -> String {
    // Common mappings
    match account_name {
        "pool" => "StablePool".to_string(),
        "farm" | "farming_period" => "FarmingPeriod".to_string(),
        "user_position" | "position" => "UserFarmingPosition".to_string(),
        "stake_position" => "UserFarmingPosition".to_string(),
        _ => {
            // Convert snake_case to PascalCase
            account_name.split('_')
                .map(|s| {
                    let mut c = s.chars();
                    match c.next() {
                        None => String::new(),
                        Some(f) => f.to_uppercase().collect::<String>() + c.as_str()
                    }
                })
                .collect()
        }
    }
}

/// Transform require_keys_eq! macro
fn transform_require_keys_eq(body: &str) -> String {
    let mut result = body.to_string();

    while let Some(start) = result.find("require_keys_eq!(") {
        if let Some(end) = find_matching_paren(&result[start..]) {
            let macro_call = &result[start..start + end + 1];
            let inner = &macro_call[17..macro_call.len() - 1]; // Strip require_keys_eq!( and )

            let parts: Vec<&str> = inner.splitn(3, ',').collect();
            if parts.len() >= 2 {
                let key1 = parts[0].trim();
                let key2 = parts[1].trim();
                let error = if parts.len() > 2 {
                    parts[2].trim()
                } else {
                    "ProgramError::InvalidAccountData"
                };
                let replacement = format!(
                    "if {} != {} {{ return Err({}.into()); }}",
                    key1, key2, error
                );
                result = result.replace(macro_call, &replacement);
            }
        } else {
            break;
        }
    }

    result
}

/// Transform emit! macro (for events)
fn transform_emit_macro(body: &str) -> String {
    let mut result = body.to_string();

    // emit!(EventName { field: value }) -> // Event: EventName { field: value }
    while let Some(start) = result.find("emit!(") {
        if let Some(end) = find_matching_paren(&result[start..]) {
            let macro_call = &result[start..start + end + 1];
            let inner = &macro_call[6..macro_call.len() - 1];
            let replacement = format!("// TODO: Emit event: {}", inner);
            result = result.replace(macro_call, &replacement);
        } else {
            break;
        }
    }

    result
}

fn transform_cpi_calls(body: &str) -> String {
    let mut result = body.to_string();

    // Transform token::transfer CPI
    result = transform_token_transfer(&result);

    // Transform token::mint_to CPI
    result = transform_token_mint_to(&result);

    // Transform token::burn CPI
    result = transform_token_burn(&result);

    // Transform system_program::create_account
    result = transform_create_account(&result);

    // Transform system_program::transfer
    result = transform_system_transfer(&result);

    result
}

/// Transform token::transfer(CpiContext::new(...), amount) to Pinocchio
fn transform_token_transfer(body: &str) -> String {
    let mut result = body.to_string();

    // Normalize spaces in CPI calls first
    result = result.replace("token :: transfer", "token::transfer");
    result = result.replace("CpiContext :: new_with_signer", "CpiContext::new_with_signer");
    result = result.replace("CpiContext :: new", "CpiContext::new");

    let patterns_no_signer = [
        "token::transfer (CpiContext::new (",
        "token::transfer(CpiContext::new(",
    ];

    let patterns_with_signer = [
        "token::transfer (CpiContext::new_with_signer (",
        "token::transfer(CpiContext::new_with_signer(",
    ];

    // Transform token::transfer with CpiContext::new (no signer)
    for pattern in patterns_no_signer {
        while let Some(start) = result.find(pattern) {
            if let Some(end) = find_transfer_end(&result[start..]) {
                let full_call = &result[start..start + end];
                let replacement = transform_single_transfer(full_call, false);
                result = result.replacen(full_call, &replacement, 1);
            } else {
                break;
            }
        }
    }

    // Transform token::transfer with CpiContext::new_with_signer
    for pattern in patterns_with_signer {
        while let Some(start) = result.find(pattern) {
            if let Some(end) = find_transfer_end(&result[start..]) {
                let full_call = &result[start..start + end];
                let replacement = transform_single_transfer(full_call, true);
                result = result.replacen(full_call, &replacement, 1);
            } else {
                break;
            }
        }
    }

    result
}

fn find_transfer_end(s: &str) -> Option<usize> {
    let mut depth = 0;
    let mut in_call = false;
    for (i, c) in s.chars().enumerate() {
        match c {
            '(' => {
                depth += 1;
                in_call = true;
            }
            ')' => {
                depth -= 1;
                if in_call && depth == 0 {
                    // Check for ? or ;
                    let rest = &s[i..];
                    if rest.starts_with(") ?") || rest.starts_with(");") {
                        return Some(i + 3);
                    }
                    return Some(i + 1);
                }
            }
            _ => {}
        }
    }
    None
}

fn transform_single_transfer(call: &str, with_signer: bool) -> String {
    // Extract from, to, authority, amount from the call
    // This is a simplified parser - real implementation would use proper AST

    // Try to find Transfer { from: X, to: Y, authority: Z }
    if let Some(transfer_start) = call.find("Transfer {") {
        let after_transfer = &call[transfer_start..];
        if let Some(brace_end) = find_matching_brace(after_transfer) {
            let transfer_body = &after_transfer[10..brace_end]; // after "Transfer {"

            // Extract fields
            let from = extract_field(transfer_body, "from");
            let to = extract_field(transfer_body, "to");
            let authority = extract_field(transfer_body, "authority");

            if with_signer {
                return format!(
                    "// Token transfer with PDA signer\n    \
                    Transfer {{\n        \
                        from: {},\n        \
                        to: {},\n        \
                        authority: {},\n    \
                    }}.invoke_signed(\n        \
                        &[{}.clone(), {}.clone(), {}.clone()],\n        \
                        signer_seeds,\n    \
                    )?",
                    clean_account_ref(&from), clean_account_ref(&to), clean_account_ref(&authority),
                    clean_account_name(&from), clean_account_name(&to), clean_account_name(&authority)
                );
            } else {
                return format!(
                    "// Token transfer\n    \
                    Transfer {{\n        \
                        from: {},\n        \
                        to: {},\n        \
                        authority: {},\n    \
                    }}.invoke(\n        \
                        &[{}.clone(), {}.clone(), {}.clone()],\n    \
                    )?",
                    clean_account_ref(&from), clean_account_ref(&to), clean_account_ref(&authority),
                    clean_account_name(&from), clean_account_name(&to), clean_account_name(&authority)
                );
            }
        }
    }

    // If parsing fails, return a TODO comment
    format!("// TODO: Transform CPI: {}", call.chars().take(100).collect::<String>())
}

fn find_matching_brace(s: &str) -> Option<usize> {
    let mut depth = 0;
    for (i, c) in s.chars().enumerate() {
        match c {
            '{' => depth += 1,
            '}' => {
                depth -= 1;
                if depth == 0 {
                    return Some(i);
                }
            }
            _ => {}
        }
    }
    None
}

fn extract_field(s: &str, field_name: &str) -> String {
    let pattern = format!("{} :", field_name);
    if let Some(start) = s.find(&pattern) {
        let after = &s[start + pattern.len()..];
        let end = after.find(',').or_else(|| after.find('}')).unwrap_or(after.len());
        return after[..end].trim().to_string();
    }
    String::new()
}

fn extract_amount(s: &str) -> String {
    // Amount is usually after ), and before )?
    let trimmed = s.trim().trim_start_matches(',').trim();
    if let Some(end) = trimmed.find(')') {
        return trimmed[..end].trim().trim_end_matches(',').to_string();
    }
    trimmed.to_string()
}

fn clean_account_ref(s: &str) -> String {
    // Convert account.to_account_info() to account.key()
    s.replace(".to_account_info ()", ".key()")
     .replace(".to_account_info()", ".key()")
}

fn clean_account_name(s: &str) -> String {
    // Extract just the account name from "account.to_account_info()"
    if let Some(dot) = s.find('.') {
        s[..dot].trim().to_string()
    } else {
        s.trim().to_string()
    }
}

/// Transform token::mint_to CPI
fn transform_token_mint_to(body: &str) -> String {
    let mut result = body.to_string();

    // Normalize spacing
    result = result.replace("token :: mint_to", "token::mint_to");

    let patterns = [
        "token::mint_to (CpiContext::new_with_signer (",
        "token::mint_to(CpiContext::new_with_signer(",
    ];

    for pattern in patterns {
        while let Some(start) = result.find(pattern) {
            if let Some(end) = find_mint_end(&result[start..]) {
                let full_call = &result[start..start + end];
                let replacement = transform_single_mint(full_call);
                result = result.replacen(full_call, &replacement, 1);
            } else {
                break;
            }
        }
    }

    result
}

fn find_mint_end(s: &str) -> Option<usize> {
    let mut depth = 0;
    let mut in_call = false;
    for (i, c) in s.chars().enumerate() {
        match c {
            '(' => {
                depth += 1;
                in_call = true;
            }
            ')' => {
                depth -= 1;
                if in_call && depth == 0 {
                    let rest = &s[i..];
                    if rest.starts_with(") ?") || rest.starts_with(");") {
                        return Some(i + 3);
                    }
                    return Some(i + 1);
                }
            }
            _ => {}
        }
    }
    None
}

fn transform_single_mint(call: &str) -> String {
    if let Some(mint_start) = call.find("MintTo {") {
        let after_mint = &call[mint_start..];
        if let Some(brace_end) = find_matching_brace(after_mint) {
            let mint_body = &after_mint[8..brace_end]; // after "MintTo {"

            let mint = extract_field(mint_body, "mint");
            let to = extract_field(mint_body, "to");
            let authority = extract_field(mint_body, "authority");

            return format!(
                "// Mint tokens with PDA signer\n    \
                MintTo {{\n        \
                    mint: {},\n        \
                    to: {},\n        \
                    authority: {},\n    \
                }}.invoke_signed(\n        \
                    &[{}.clone(), {}.clone(), {}.clone()],\n        \
                    signer_seeds,\n    \
                )?",
                clean_account_ref(&mint), clean_account_ref(&to), clean_account_ref(&authority),
                clean_account_name(&mint), clean_account_name(&to), clean_account_name(&authority)
            );
        }
    }

    format!("// TODO: Transform mint CPI: {}", call.chars().take(80).collect::<String>())
}

/// Transform token::burn CPI
fn transform_token_burn(body: &str) -> String {
    let mut result = body.to_string();

    result = result.replace(
        "token::burn(",
        "// Pinocchio burn\n    pinocchio_token::instructions::Burn {\n        account: "
    );

    result
}

/// Transform system_program::create_account
fn transform_create_account(body: &str) -> String {
    let mut result = body.to_string();

    result = result.replace(
        "system_program::create_account(",
        "// Pinocchio create_account\n    pinocchio_system::instructions::CreateAccount {\n        from: "
    );

    result
}

/// Transform system_program::transfer (SOL transfer)
fn transform_system_transfer(body: &str) -> String {
    let mut result = body.to_string();

    result = result.replace(
        "system_program::transfer(",
        "// Pinocchio SOL transfer\n    pinocchio_system::instructions::Transfer {\n        from: "
    );

    result
}

fn inline_cpi_calls(body: &str) -> String {
    // Inline CPI for maximum optimization
    body.to_string()
}

fn transform_require_macro(body: &str) -> String {
    // Replace require!(cond, Error) with if !cond { return Err(Error.into()); }
    let mut result = body.to_string();

    // Handle spaced version: require ! (...)
    while let Some(start) = result.find("require ! (") {
        if let Some(end) = find_matching_paren(&result[start + 10..]) {
            let macro_call = &result[start..start + 11 + end + 1];
            let inner = &result[start + 11..start + 11 + end]; // After "require ! ("

            if let Some(comma) = find_last_comma(inner) {
                let cond = inner[..comma].trim();
                let error = inner[comma + 1..].trim();
                let replacement = format!(
                    "if !({}) {{\n        return Err({}.into());\n    }}",
                    clean_spaces(cond), error.trim_end_matches(')')
                );
                result = result.replacen(macro_call, &replacement, 1);
            } else {
                break;
            }
        } else {
            break;
        }
    }

    // Handle compact version: require!(...)
    while let Some(start) = result.find("require!(") {
        if let Some(end) = find_matching_paren(&result[start..]) {
            let macro_call = &result[start..start + end + 1];
            let inner = &macro_call[9..macro_call.len() - 1]; // Strip require!( and )

            if let Some(comma) = find_last_comma(inner) {
                let cond = inner[..comma].trim();
                let error = inner[comma + 1..].trim();
                let replacement = format!(
                    "if !({}) {{\n        return Err({}.into());\n    }}",
                    clean_spaces(cond), error
                );
                result = result.replacen(macro_call, &replacement, 1);
            } else {
                break;
            }
        } else {
            break;
        }
    }

    result
}

/// Find the last comma at the top level (not inside nested parens)
fn find_last_comma(s: &str) -> Option<usize> {
    let mut depth = 0;
    let mut last_comma = None;
    for (i, c) in s.chars().enumerate() {
        match c {
            '(' | '[' | '{' => depth += 1,
            ')' | ']' | '}' => depth -= 1,
            ',' if depth == 0 => last_comma = Some(i),
            _ => {}
        }
    }
    last_comma
}

/// Clean up extra spaces from tokenization
fn clean_spaces(s: &str) -> String {
    let mut result = s.to_string();
    // Fix operators with spaces
    result = result.replace(" . ", ".");
    result = result.replace(" :: ", "::");
    result = result.replace("( )", "()");
    result = result.replace("< ", "<");
    result = result.replace(" >", ">");
    result = result.replace(" ,", ",");
    // Fix comparison operators
    result = result.replace("> =", ">=");
    result = result.replace("< =", "<=");
    result = result.replace("= =", "==");
    result = result.replace("! =", "!=");
    // Clean multiple spaces
    while result.contains("  ") {
        result = result.replace("  ", " ");
    }
    result.trim().to_string()
}

fn find_matching_paren(s: &str) -> Option<usize> {
    let mut depth = 0;
    for (i, c) in s.chars().enumerate() {
        match c {
            '(' => depth += 1,
            ')' => {
                depth -= 1;
                if depth == 0 {
                    return Some(i);
                }
            }
            _ => {}
        }
    }
    None
}

fn transform_state(
    anchor_state: &AnchorStateStruct,
    analysis: &ProgramAnalysis,
) -> Result<PinocchioState> {
    let size_info = analysis.account_sizes.iter()
        .find(|s| s.struct_name == anchor_state.name);

    let total_size = size_info.map(|s| s.size).unwrap_or(0);

    let mut offset = 8; // Skip discriminator
    let fields: Vec<PinocchioField> = anchor_state.fields.iter()
        .map(|f| {
            let size = estimate_field_size(&f.ty);
            let field = PinocchioField {
                name: f.name.clone(),
                ty: rust_type_to_pinocchio(&f.ty),
                size,
                offset,
            };
            offset += size;
            field
        })
        .collect();

    Ok(PinocchioState {
        name: anchor_state.name.clone(),
        size: total_size,
        fields,
    })
}

fn estimate_field_size(ty: &str) -> usize {
    let ty = ty.replace(" ", "").to_lowercase();

    match ty.as_str() {
        "bool" => 1,
        "u8" | "i8" => 1,
        "u16" | "i16" => 2,
        "u32" | "i32" => 4,
        "u64" | "i64" => 8,
        "u128" | "i128" => 16,
        "pubkey" => 32,
        _ => 32,
    }
}

fn rust_type_to_pinocchio(ty: &str) -> String {
    ty.replace("Pubkey", "[u8; 32]")
}

fn transform_errors(anchor_errors: &[AnchorError]) -> Vec<PinocchioError> {
    anchor_errors.iter()
        .map(|e| PinocchioError {
            name: e.name.clone(),
            code: e.code.unwrap_or(6000),
            msg: e.msg.clone(),
        })
        .collect()
}

fn anchor_discriminator(name: &str) -> Vec<u8> {
    // Anchor uses: sha256("global:{name}")[0..8]
    use sha2::{Sha256, Digest};

    let preimage = format!("global:{}", to_snake_case(name));
    let hash = Sha256::digest(preimage.as_bytes());

    hash[..8].to_vec()
}

fn to_snake_case(s: &str) -> String {
    let mut result = String::new();
    for (i, c) in s.chars().enumerate() {
        if c.is_uppercase() {
            if i > 0 {
                result.push('_');
            }
            result.push(c.to_lowercase().next().unwrap());
        } else {
            result.push(c);
        }
    }
    result
}
