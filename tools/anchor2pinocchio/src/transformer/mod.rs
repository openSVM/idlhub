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
            // Handle various spacing patterns
            result = result.replace(
                &format!("ctx . bumps . {}", acc.name),
                &format!("{}_bump", acc.name)
            );
            result = result.replace(
                &format!("ctx.bumps.{}", acc.name),
                &format!("{}_bump", acc.name)
            );
        }
    }

    // Also handle any generic ctx.bumps references
    result = result.replace("ctx . bumps . ", "_bump_");
    result = result.replace("ctx.bumps.", "_bump_");

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

    // Clean up the entire body first so patterns are normalized
    result = clean_spaces(&result);

    // NOW do state access transformation (after clean_spaces normalizes patterns)
    result = transform_state_access_final(&result);

    // Split into proper statements
    result = format_body_statements(&result);

    result
}

/// Final pass to add state deserialization (runs after clean_spaces)
fn transform_state_access_final(body: &str) -> String {
    let mut result = body.to_string();

    // Patterns for state accounts and their types
    let state_patterns = [
        ("pool", "StablePool"),
        ("farming_period", "FarmingPeriod"),
        ("user_position", "UserFarmingPosition"),
        ("stake_position", "UserFarmingPosition"),
    ];

    // Check which state accounts need deserialization
    let mut needs_deser: Vec<(&str, &str)> = Vec::new();

    for (acc_name, state_type) in &state_patterns {
        // Look for field access patterns like pool.bags_balance
        let field_pattern = format!("{}.", acc_name);
        if result.contains(&field_pattern) {
            // Don't add if it's only method calls like pool.key() or pool.is_writable()
            let has_field_access = has_state_field_access(&result, acc_name);
            if has_field_access {
                needs_deser.push((acc_name, state_type));
            }
        }
    }

    // If we have state accounts, insert deserialization and rename fields
    if !needs_deser.is_empty() {
        // First replace field accesses
        for (acc_name, _) in &needs_deser {
            result = replace_state_fields(&result, acc_name);
        }

        // Then add deserialization block at the start
        let deser_lines: Vec<String> = needs_deser.iter()
            .map(|(acc, ty)| format!(
                "let {}_state = {}::from_account_info_mut({})?;",
                acc, ty, acc
            ))
            .collect();

        let deser_block = format!(
            "// Deserialize state accounts\n{}\n\n",
            deser_lines.join("\n")
        );

        result = format!("{}{}", deser_block, result);
    }

    result
}

fn has_state_field_access(body: &str, acc_name: &str) -> bool {
    let state_fields = [
        "authority", "bags_mint", "pump_mint", "bags_vault", "pump_vault",
        "lp_mint", "bags_balance", "pump_balance", "lp_supply", "bump",
        "paused", "swap_fee_bps", "admin_fee_percent", "amplification",
        "pending_authority", "authority_transfer_time", "admin_fees_bags",
        "admin_fees_pump", "total_volume_bags", "total_volume_pump",
        "ramp_start_time", "ramp_stop_time", "initial_amplification",
        "target_amplification", "amp_commit_hash", "amp_commit_time",
        "bags_vault_bump", "pump_vault_bump", "lp_mint_bump",
        "total_staked", "accumulated_reward_per_share", "acc_reward_per_share",
        "last_update_time", "reward_per_second", "start_time", "end_time",
        "total_rewards", "distributed_rewards", "staked_amount", "reward_debt",
        "pending_rewards", "lp_staked", "owner",
    ];

    for field in &state_fields {
        let pattern = format!("{}.{}", acc_name, field);
        if body.contains(&pattern) {
            return true;
        }
    }
    false
}

fn replace_state_fields(body: &str, acc_name: &str) -> String {
    let mut result = body.to_string();

    let state_fields = [
        "authority", "bags_mint", "pump_mint", "bags_vault", "pump_vault",
        "lp_mint", "bags_balance", "pump_balance", "lp_supply", "bump",
        "paused", "swap_fee_bps", "admin_fee_percent", "amplification",
        "pending_authority", "authority_transfer_time", "admin_fees_bags",
        "admin_fees_pump", "total_volume_bags", "total_volume_pump",
        "ramp_start_time", "ramp_stop_time", "initial_amplification",
        "target_amplification", "amp_commit_hash", "amp_commit_time",
        "bags_vault_bump", "pump_vault_bump", "lp_mint_bump",
        "total_staked", "accumulated_reward_per_share", "acc_reward_per_share",
        "last_update_time", "reward_per_second", "start_time", "end_time",
        "total_rewards", "distributed_rewards", "staked_amount", "reward_debt",
        "pending_rewards", "lp_staked", "owner",
    ];

    for field in &state_fields {
        let old_pattern = format!("{}.{}", acc_name, field);
        let new_pattern = format!("{}_state.{}", acc_name, field);
        result = result.replace(&old_pattern, &new_pattern);
    }

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
            &format!("// Access {} as mutable\n    let {}_state = {}::from_account_info_mut(&{})?", acc.name, acc.name, get_state_type(&acc.name), acc.name)
        );
        // Pattern: account.load()?
        result = result.replace(
            &format!("{}.load()?", acc.name),
            &format!("// Access {} as readonly\n    let {}_state = {}::from_account_info(&{})?", acc.name, acc.name, get_state_type(&acc.name), acc.name)
        );
    }

    // Detect state accounts that need deserialization
    // Common state account patterns
    let state_account_patterns = [
        ("pool", "StablePool", true),
        ("farming_period", "FarmingPeriod", true),
        ("user_position", "UserFarmingPosition", true),
        ("stake_position", "UserFarmingPosition", true),
    ];

    let mut deserializations = Vec::new();

    for (acc_name, state_type, is_mutable) in &state_account_patterns {
        // Check if body accesses this account's fields
        let field_pattern = format!("{}.", acc_name);
        if result.contains(&field_pattern) {
            // Check if we already have deserialization
            let deser_check = format!("{}_state", acc_name);
            if !result.contains(&deser_check) {
                let deser_code = if *is_mutable {
                    format!(
                        "let {}_state = {}::from_account_info_mut({})?;",
                        acc_name, state_type, acc_name
                    )
                } else {
                    format!(
                        "let {}_state = {}::from_account_info({})?;",
                        acc_name, state_type, acc_name
                    )
                };
                deserializations.push(deser_code);

                // Replace account.field with account_state.field
                // But NOT account.key() or account.is_signer() etc.
                result = replace_state_field_access(&result, acc_name);
            }
        }
    }

    // Insert deserializations at the beginning
    if !deserializations.is_empty() {
        let deser_block = format!(
            "// Deserialize state accounts\n    {}\n\n    ",
            deserializations.join("\n    ")
        );
        result = format!("{}{}", deser_block, result);
    }

    result
}

/// Replace account.field with account_state.field, but not account.key() etc.
fn replace_state_field_access(body: &str, acc_name: &str) -> String {
    let mut result = body.to_string();

    // List of AccountInfo methods that should NOT be replaced
    let account_info_methods = [
        "key", "owner", "lamports", "data", "is_signer", "is_writable",
        "try_borrow_data", "try_borrow_mut_data", "try_borrow_lamports",
        "try_borrow_mut_lamports", "to_account_info", "clone",
    ];

    // Common state fields that SHOULD be replaced
    let state_fields = [
        "authority", "bags_mint", "pump_mint", "bags_vault", "pump_vault",
        "lp_mint", "bags_balance", "pump_balance", "lp_supply", "bump",
        "paused", "swap_fee_bps", "admin_fee_percent", "amplification",
        "initial_amp", "target_amp", "amp_ramp_start", "amp_ramp_end",
        "pending_authority", "authority_transfer_time", "amp_commit_hash",
        "amp_commit_time", "admin_fees_bags", "admin_fees_pump",
        "bags_vault_bump", "pump_vault_bump", "lp_mint_bump",
        "total_volume_bags", "total_volume_pump", "total_staked",
        "accumulated_reward_per_share", "last_update_time", "reward_per_second",
        "start_time", "end_time", "total_rewards", "distributed_rewards",
        "staked_amount", "reward_debt", "pending_rewards",
    ];

    for field in &state_fields {
        // Replace acc.field with acc_state.field
        let old_pattern = format!("{}. {}", acc_name, field);
        let new_pattern = format!("{}_state.{}", acc_name, field);
        result = result.replace(&old_pattern, &new_pattern);

        // Also handle without space
        let old_pattern2 = format!("{}.{}", acc_name, field);
        result = result.replace(&old_pattern2, &new_pattern);
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

            // Extract amount from after the Transfer struct
            // Pattern: }, signer_seeds,), amount,)?
            // or: },), amount,)?
            let rest_of_call = &call[transfer_start + brace_end..];
            let amount = extract_transfer_amount(rest_of_call);

            if with_signer {
                return format!(
                    "// Token transfer with PDA signer\n    \
                    Transfer {{\n        \
                        from: {},\n        \
                        to: {},\n        \
                        authority: {},\n        \
                        amount: {},\n    \
                    }}.invoke_signed(\n        \
                        &[{}.clone(), {}.clone(), {}.clone()],\n        \
                        signer_seeds,\n    \
                    )?",
                    clean_account_ref(&from), clean_account_ref(&to), clean_account_ref(&authority),
                    amount,
                    clean_account_name(&from), clean_account_name(&to), clean_account_name(&authority)
                );
            } else {
                return format!(
                    "// Token transfer\n    \
                    Transfer {{\n        \
                        from: {},\n        \
                        to: {},\n        \
                        authority: {},\n        \
                        amount: {},\n    \
                    }}.invoke(\n        \
                        &[{}.clone(), {}.clone(), {}.clone()],\n    \
                    )?",
                    clean_account_ref(&from), clean_account_ref(&to), clean_account_ref(&authority),
                    amount,
                    clean_account_name(&from), clean_account_name(&to), clean_account_name(&authority)
                );
            }
        }
    }

    // If parsing fails, return a TODO comment
    format!("// TODO: Transform CPI: {}", call.chars().take(100).collect::<String>())
}

/// Extract the amount from a token::transfer call
/// The amount is the last argument before the closing )?
fn extract_transfer_amount(rest: &str) -> String {
    // Pattern: }, signer_seeds,), amount_in,)?
    // or: },), amount_in,)?
    // We need to find the last argument before )?

    // Find the last comma-separated value before )?
    let trimmed = rest.trim();

    // Look for pattern: ), amount)?
    // The amount is between the last ), and )?
    if let Some(last_paren) = trimmed.rfind(") ?") {
        let before_end = &trimmed[..last_paren];
        // Find the previous comma
        if let Some(comma_pos) = before_end.rfind(',') {
            let amount = before_end[comma_pos + 1..].trim().trim_end_matches(')').trim();
            if !amount.is_empty() && !amount.contains("signer") {
                return clean_spaces_simple(amount);
            }
        }
    }

    // Fallback: look for common amount variable names
    for var in ["amount_in", "amount_out", "amount", "lp_amount", "amount_out_after_fee"] {
        if rest.contains(var) {
            return var.to_string();
        }
    }

    "amount".to_string() // Default fallback
}

fn clean_spaces_simple(s: &str) -> String {
    s.replace(" ", "").replace(",", "")
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
    // In Pinocchio, we just pass the account key directly
    // Remove .to_account_info() calls and use .key() instead
    let mut result = s.to_string();
    result = result.replace(".to_account_info ()", ".key()");
    result = result.replace(".to_account_info()", ".key()");
    result = result.replace(". to_account_info ()", ".key()");
    result = result.replace(". to_account_info()", ".key()");
    result
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

            // Extract amount from after the MintTo struct
            let rest_of_call = &call[mint_start + brace_end..];
            let amount = extract_mint_amount(rest_of_call);

            return format!(
                "// Mint tokens with PDA signer\n    \
                MintTo {{\n        \
                    mint: {},\n        \
                    to: {},\n        \
                    authority: {},\n        \
                    amount: {},\n    \
                }}.invoke_signed(\n        \
                    &[{}.clone(), {}.clone(), {}.clone()],\n        \
                    signer_seeds,\n    \
                )?",
                clean_account_ref(&mint), clean_account_ref(&to), clean_account_ref(&authority),
                amount,
                clean_account_name(&mint), clean_account_name(&to), clean_account_name(&authority)
            );
        }
    }

    format!("// TODO: Transform mint CPI: {}", call.chars().take(80).collect::<String>())
}

/// Extract amount from mint_to call
fn extract_mint_amount(rest: &str) -> String {
    // Similar to transfer amount extraction
    let trimmed = rest.trim();

    if let Some(last_paren) = trimmed.rfind(") ?") {
        let before_end = &trimmed[..last_paren];
        if let Some(comma_pos) = before_end.rfind(',') {
            let amount = before_end[comma_pos + 1..].trim().trim_end_matches(')').trim();
            if !amount.is_empty() && !amount.contains("signer") {
                return clean_spaces_simple(amount);
            }
        }
    }

    // Fallback
    for var in ["lp_amount", "amount", "mint_amount"] {
        if rest.contains(var) {
            return var.to_string();
        }
    }

    "amount".to_string()
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
