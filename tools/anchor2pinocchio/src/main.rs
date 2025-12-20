use anyhow::Result;
use clap::Parser as ClapParser;
use std::path::PathBuf;

mod parser;
mod analyzer;
mod transformer;
mod emitter;
mod ir;
mod cpi_helpers;

#[derive(ClapParser, Debug)]
#[command(name = "anchor2pinocchio")]
#[command(about = "Transpile Anchor programs to Pinocchio for 85%+ size reduction")]
struct Args {
    /// Input Anchor program (lib.rs)
    #[arg(required = true)]
    input: PathBuf,

    /// Output directory for Pinocchio program
    #[arg(short, long, default_value = "output")]
    output: PathBuf,

    /// Use no_allocator! for maximum size reduction
    #[arg(long)]
    no_alloc: bool,

    /// Use lazy_program_entrypoint! for on-demand parsing
    #[arg(long)]
    lazy_entrypoint: bool,

    /// Inline CPI calls where possible
    #[arg(long)]
    inline_cpi: bool,

    /// Generate IDL-compatible discriminators (8-byte Anchor style)
    #[arg(long)]
    anchor_compat: bool,

    /// Verbose output
    #[arg(short, long)]
    verbose: bool,
}

fn main() -> Result<()> {
    let args = Args::parse();

    if args.verbose {
        println!("anchor2pinocchio v{}", env!("CARGO_PKG_VERSION"));
        println!("Input:  {:?}", args.input);
        println!("Output: {:?}", args.output);
    }

    // Phase 1: Parse Anchor source
    if args.verbose {
        println!("\n[1/4] Parsing Anchor program...");
    }
    let anchor_program = parser::parse_anchor_file(&args.input)?;

    if args.verbose {
        println!("  Found {} instructions", anchor_program.instructions.len());
        println!("  Found {} account structs", anchor_program.account_structs.len());
        println!("  Found {} state structs", anchor_program.state_structs.len());
    }

    // Phase 2: Analyze
    if args.verbose {
        println!("\n[2/4] Analyzing program...");
    }
    let analysis = analyzer::analyze(&anchor_program)?;

    if args.verbose {
        println!("  PDAs: {}", analysis.pdas.len());
        println!("  CPIs: {}", analysis.cpi_calls.len());
    }

    // Phase 3: Transform to Pinocchio IR
    if args.verbose {
        println!("\n[3/4] Transforming to Pinocchio IR...");
    }
    let config = transformer::Config {
        no_alloc: args.no_alloc,
        lazy_entrypoint: args.lazy_entrypoint,
        inline_cpi: args.inline_cpi,
        anchor_compat: args.anchor_compat,
    };
    let pinocchio_ir = transformer::transform(&anchor_program, &analysis, &config)?;

    // Phase 4: Emit Pinocchio code
    if args.verbose {
        println!("\n[4/4] Emitting Pinocchio code...");
    }
    emitter::emit(&pinocchio_ir, &args.output)?;

    println!("\nSuccess! Pinocchio program written to {:?}", args.output);
    println!("\nNext steps:");
    println!("  1. cd {:?}", args.output);
    println!("  2. cargo build-sbf");
    println!("  3. Compare .so sizes!");

    Ok(())
}
