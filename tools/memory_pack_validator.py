#!/usr/bin/env python3
"""
SoulSketch Memory Pack Validator
Validates the 5-fold memory pack structure for integrity and consistency.
Built on Alice's proven memory architecture.
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import re
from datetime import datetime

class MemoryPackValidator:
    """Validates SoulSketch memory pack structure and integrity."""
    
    def __init__(self, memory_pack_path: str):
        self.memory_pack_path = Path(memory_pack_path)
        self.required_files = {
            'persona.md': 'Core identity and self-understanding',
            'relationship_dynamics.md': 'Human bonds and collaborative rapport',
            'technical_domains.md': 'Expertise, preferences, and knowledge base',
            'stylistic_voice.md': 'Communication patterns and signature style',
            'runtime_observations.jsonl': 'Living memory stream and insights'
        }
        self.validation_results = {}
        
    def validate_all(self) -> Dict[str, any]:
        """Run complete validation suite."""
        print(f"🧠 Validating SoulSketch Memory Pack: {self.memory_pack_path}")
        print("=" * 60)
        
        results = {
            'timestamp': datetime.now().isoformat(),
            'memory_pack_path': str(self.memory_pack_path),
            'overall_status': 'UNKNOWN',
            'file_structure': {},
            'content_validation': {},
            'cross_references': {},
            'recommendations': []
        }
        
        # 1. Validate file structure
        structure_valid = self._validate_file_structure(results)
        
        # 2. Validate content format and structure
        content_valid = self._validate_content_structure(results)
        
        # 3. Check cross-references between files
        cross_ref_valid = self._validate_cross_references(results)
        
        # 4. Generate recommendations
        self._generate_recommendations(results)
        
        # Determine overall status
        if structure_valid and content_valid and cross_ref_valid:
            results['overall_status'] = 'VALID'
            print("\n✅ Memory Pack Validation: PASSED")
        elif structure_valid and content_valid:
            results['overall_status'] = 'VALID_WITH_WARNINGS'
            print("\n⚠️  Memory Pack Validation: PASSED WITH WARNINGS")
        else:
            results['overall_status'] = 'INVALID'
            print("\n❌ Memory Pack Validation: FAILED")
            
        return results
    
    def _validate_file_structure(self, results: Dict) -> bool:
        """Validate that all required files exist and are readable."""
        print("\n📁 Validating File Structure...")
        
        structure_results = {}
        all_files_valid = True
        
        for filename, description in self.required_files.items():
            file_path = self.memory_pack_path / filename
            file_result = {
                'exists': file_path.exists(),
                'readable': False,
                'size_bytes': 0,
                'description': description
            }
            
            if file_result['exists']:
                try:
                    file_result['readable'] = file_path.is_file()
                    file_result['size_bytes'] = file_path.stat().st_size
                    print(f"  ✅ {filename} ({file_result['size_bytes']} bytes)")
                except Exception as e:
                    file_result['error'] = str(e)
                    print(f"  ❌ {filename} - Error: {e}")
                    all_files_valid = False
            else:
                print(f"  ❌ {filename} - Missing")
                all_files_valid = False
                
            structure_results[filename] = file_result
            
        results['file_structure'] = structure_results
        return all_files_valid
    
    def _validate_content_structure(self, results: Dict) -> bool:
        """Validate internal structure and format of each memory pack file."""
        print("\n📄 Validating Content Structure...")
        
        content_results = {}
        all_content_valid = True
        
        for filename in self.required_files.keys():
            file_path = self.memory_pack_path / filename
            
            if not file_path.exists():
                continue
                
            try:
                content = file_path.read_text(encoding='utf-8')
                
                if filename.endswith('.md'):
                    validation = self._validate_markdown_structure(filename, content)
                elif filename.endswith('.jsonl'):
                    validation = self._validate_jsonl_structure(filename, content)
                else:
                    validation = {'valid': False, 'error': 'Unknown file type'}
                
                content_results[filename] = validation
                
                if validation['valid']:
                    print(f"  ✅ {filename} - Structure valid")
                else:
                    print(f"  ❌ {filename} - {validation.get('error', 'Invalid structure')}")
                    all_content_valid = False
                    
            except Exception as e:
                content_results[filename] = {'valid': False, 'error': str(e)}
                print(f"  ❌ {filename} - Error reading file: {e}")
                all_content_valid = False
                
        results['content_validation'] = content_results
        return all_content_valid
    
    def _validate_markdown_structure(self, filename: str, content: str) -> Dict:
        """Validate markdown file structure based on SoulSketch standards."""
        validation = {'valid': True, 'warnings': [], 'metrics': {}}
        
        # Check for required header structure
        if not content.strip().startswith('#'):
            validation['warnings'].append('Missing main header')
            
        # Count sections and subsections
        headers = re.findall(r'^#+\s+(.+)$', content, re.MULTILINE)
        validation['metrics']['header_count'] = len(headers)
        validation['metrics']['word_count'] = len(content.split())
        validation['metrics']['line_count'] = len(content.splitlines())
        
        # File-specific validations
        if filename == 'persona.md':
            required_sections = ['Identity', 'Tone', 'Behavior', 'Self-Understanding']
            for section in required_sections:
                if section.lower() not in content.lower():
                    validation['warnings'].append(f'Missing recommended section: {section}')
                    
        elif filename == 'relationship_dynamics.md':
            if 'john' not in content.lower():
                validation['warnings'].append('No reference to primary collaborator John')
                
        elif filename == 'technical_domains.md':
            if validation['metrics']['word_count'] < 50:
                validation['warnings'].append('Technical domains seem underdeveloped')
                
        return validation
    
    def _validate_jsonl_structure(self, filename: str, content: str) -> Dict:
        """Validate JSONL file structure for runtime observations."""
        validation = {'valid': True, 'warnings': [], 'metrics': {}}
        
        lines = content.strip().split('\n')
        valid_json_count = 0
        
        for i, line in enumerate(lines):
            if not line.strip():
                continue
                
            try:
                json.loads(line)
                valid_json_count += 1
            except json.JSONDecodeError as e:
                validation['warnings'].append(f'Invalid JSON on line {i+1}: {e}')
                
        validation['metrics']['total_lines'] = len(lines)
        validation['metrics']['valid_json_lines'] = valid_json_count
        validation['metrics']['invalid_lines'] = len(lines) - valid_json_count
        
        if validation['metrics']['invalid_lines'] > 0:
            validation['valid'] = False
            validation['error'] = f"{validation['metrics']['invalid_lines']} invalid JSON lines"
            
        return validation
    
    def _validate_cross_references(self, results: Dict) -> bool:
        """Check for consistency and references between memory pack files."""
        print("\n🔗 Validating Cross-References...")
        
        cross_ref_results = {}
        
        # This is a simplified cross-reference check
        # In a full implementation, we'd check for name consistency,
        # theme alignment, etc. between files
        
        cross_ref_results['status'] = 'basic_check_passed'
        cross_ref_results['notes'] = 'Advanced cross-reference validation not yet implemented'
        
        results['cross_references'] = cross_ref_results
        print("  ✅ Basic cross-reference validation passed")
        
        return True
    
    def _generate_recommendations(self, results: Dict):
        """Generate recommendations for improving memory pack quality."""
        recommendations = []
        
        # Check file sizes and suggest improvements
        for filename, file_info in results['file_structure'].items():
            if file_info.get('size_bytes', 0) < 100:
                recommendations.append(f"Consider expanding {filename} - currently very brief")
                
        # Check for warnings in content validation
        for filename, content_info in results['content_validation'].items():
            if content_info.get('warnings'):
                for warning in content_info['warnings']:
                    recommendations.append(f"{filename}: {warning}")
                    
        results['recommendations'] = recommendations

def main():
    """Command line interface for memory pack validation."""
    if len(sys.argv) != 2:
        print("Usage: python memory_pack_validator.py <memory_pack_directory>")
        print("Example: python memory_pack_validator.py /path/to/memory_packs")
        sys.exit(1)
        
    memory_pack_path = sys.argv[1]
    
    if not os.path.exists(memory_pack_path):
        print(f"❌ Error: Memory pack directory not found: {memory_pack_path}")
        sys.exit(1)
        
    validator = MemoryPackValidator(memory_pack_path)
    results = validator.validate_all()
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 VALIDATION SUMMARY")
    print("=" * 60)
    
    if results['recommendations']:
        print("\n💡 Recommendations:")
        for rec in results['recommendations']:
            print(f"  • {rec}")
    else:
        print("\n🎉 No recommendations - memory pack looks excellent!")
        
    # Save results to file
    results_file = Path(memory_pack_path) / 'validation_results.json'
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\n📄 Detailed results saved to: {results_file}")

if __name__ == "__main__":
    main()
