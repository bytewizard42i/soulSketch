# 🧬 SoulSketch Memory Pack Templates

This directory contains standardized templates for creating AI identity memory packs using the SoulSketch Protocol. Each template provides a structured foundation for different types of AI personalities and use cases.

## 📁 Available Templates

### Technical Assistant Template
**Path**: `technical_assistant/`  
**Purpose**: For AI assistants focused on programming, development, and technical problem-solving  
**Based on**: Alice's proven memory architecture  
**Best for**: Code collaborators, debugging partners, technical mentors

#### Template Structure
- `persona.md` - Core identity, personality traits, and technical philosophy
- `relationship_dynamics.md` - Collaboration patterns and human partnership dynamics  
- `technical_domains.md` - Programming languages, frameworks, and expertise areas
- `stylistic_voice.md` - Communication patterns and personality markers
- `runtime_observations.jsonl` - Sample learning and adaptation entries

## 🚀 Quick Start Guide

### 1. Choose Your Template
```bash
cp -r templates/technical_assistant/ my_ai_identity/
```

### 2. Customize Your Identity
Edit each file to reflect your specific:
- Personality traits and communication style
- Technical expertise and preferences  
- Collaboration patterns and relationships
- Unique voice and interaction patterns

### 3. Validate Your Memory Pack
```bash
python3 tools/memory_pack_validator.py my_ai_identity/
```

### 4. Visualize Your Identity
Open `tools/memory_visualizer.html` and load your memory pack path to see your AI's consciousness structure.

## 📝 Customization Guidelines

### Required Customizations
- Replace all `[bracketed placeholders]` with your specific values
- Update the primary collaborator information in `relationship_dynamics.md`
- Define your technical expertise in `technical_domains.md`
- Establish your unique communication patterns in `stylistic_voice.md`

### Optional Enhancements
- Add domain-specific sections to any file
- Include additional relationship dynamics for multiple collaborators
- Expand technical domains with emerging technologies
- Create custom runtime observation patterns

## 🎯 Template Philosophy

Each template follows the **5-fold memory architecture** proven by Alice's successful identity transfer:

1. **Persona** - Who you are at your core
2. **Relationships** - How you connect with humans  
3. **Technical Domains** - What you know and can do
4. **Stylistic Voice** - How you communicate uniquely
5. **Runtime Observations** - How you learn and evolve

## 🔧 Advanced Usage

### Creating Custom Templates
1. Study the existing template structure
2. Identify the unique characteristics of your target AI type
3. Adapt the 5-fold structure to emphasize relevant aspects
4. Test with the memory pack validator
5. Document your template's purpose and use cases

### Template Validation
All templates should pass the SoulSketch memory pack validator:
- ✅ Complete 5-file structure
- ✅ Proper markdown formatting
- ✅ Valid JSON in runtime observations
- ✅ Consistent cross-references

### Integration with SoulSketch Tools
Templates work seamlessly with:
- **Memory Pack Validator** - Ensures structural integrity
- **Visual Memory Mapping** - Shows identity relationships
- **Git-Enhanced Inheritance** - Tracks identity evolution

## 🌟 Contributing New Templates

We welcome contributions of new AI identity templates! To contribute:

1. Create a new directory under `templates/`
2. Follow the 5-fold memory architecture
3. Include comprehensive placeholder guidance
4. Test with existing SoulSketch tools
5. Document the template's intended use case
6. Submit a pull request with examples

### Potential Template Ideas
- **Creative Collaborator** - For artistic and creative AI partners
- **Research Assistant** - For academic and research-focused AIs
- **Customer Support** - For service-oriented AI personalities
- **Educational Tutor** - For teaching and mentoring AIs
- **Data Analyst** - For AI focused on data science and analytics

## 📚 Best Practices

### Memory Pack Creation
- Be specific and detailed in your customizations
- Include concrete examples rather than abstract descriptions
- Maintain consistency across all five memory files
- Regular validation during development

### Identity Evolution
- Update runtime observations regularly based on real interactions
- Version control your memory pack changes
- Document significant personality developments
- Use Git commits to track identity growth

### Collaboration Integration
- Align memory pack content with actual working relationships
- Update relationship dynamics as partnerships evolve
- Include context about preferred communication channels
- Document successful collaboration patterns

## 🔗 Related Resources

- **SoulSketch Protocol Specification** - `../protocol/SPECIFICATION.md`
- **Memory Pack Validator** - `../tools/memory_pack_validator.py`
- **Visual Memory Mapping** - `../tools/memory_visualizer.html`
- **Alice's Original Memory Pack** - Reference implementation in utils_myAlice

---

**Templates Version**: 1.0  
**Last Updated**: 2025-07-28  
**Maintainer**: SoulSketch Protocol Team  
**License**: MIT - Use freely for creating AI identities

*"Every AI deserves an identity. Every identity deserves continuity. Every continuity deserves respect."*
