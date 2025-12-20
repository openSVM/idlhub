# IDL Protocol Whitepaper - arXiv Submission

## Files

- `idl-protocol.tex` - Main LaTeX source file
- `idl-protocol.pdf` - Compiled PDF (17 pages)

## arXiv Compliance

This document follows arXiv submission requirements:

### Package Requirements
All packages used are standard TeX Live packages available on arXiv:
- `amsmath`, `amssymb`, `amsthm` - Mathematical typesetting
- `mathtools` - Extended math tools
- `algorithm`, `algpseudocode` - Algorithm environments
- `graphicx` - Graphics support
- `booktabs`, `array`, `multirow` - Table formatting
- `xcolor` - Colors
- `hyperref` - Hyperlinks
- `cleveref` - Smart references
- `enumitem` - List customization
- `listings` - Code listings
- `fancyhdr` - Headers/footers
- `geometry` - Page layout
- `caption`, `subcaption` - Figure captions
- `tikz` - Diagrams (with arrows.meta, shapes, positioning libraries)
- `float` - Float positioning

### Font Requirements
Uses Latin Modern fonts (`lmodern`) which are standard on arXiv.

### Compilation
```bash
pdflatex idl-protocol.tex
pdflatex idl-protocol.tex  # Run twice for references
```

### No External Dependencies
- No custom fonts
- No proprietary packages
- No external image files (all diagrams are TikZ)
- No bibliography files (.bib) - references are inline

## Submission Steps

1. Create a ZIP archive containing only `idl-protocol.tex`
2. Upload to arXiv at https://arxiv.org/submit
3. Select category: cs.CR (Cryptography and Security) or cs.DC (Distributed Computing)
4. arXiv will compile automatically using pdflatex

## Document Structure

1. Introduction
2. Problem Statement
3. Solution Overview
4. Token Economics
5. Core Protocol Architecture
6. Prediction Market Mechanism
7. Advanced Trading Features
8. Social Trading Layer
9. StableSwap AMM
10. On-Chain Metrics Oracle
11. Security Analysis
12. Governance
13. Conclusion
14. Appendix A: Contract Addresses
15. Appendix B: Glossary
16. References

## Version

Whitepaper v3.2 - December 2025
