#!/usr/bin/env python3

"""
Enhanced SoulSketch Protocol Pack Creator
Creates timestamped zip files with unique thumbnails for Alice
"""

import os
import sys
import zipfile
import hashlib
from datetime import datetime
from pathlib import Path
import json
import subprocess
from PIL import Image, ImageDraw, ImageFont
import io

class SoulSketchZipCreator:
    def __init__(self, repo_path):
        self.repo_path = Path(repo_path)
        self.timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        self.date_only = datetime.now().strftime("%Y-%m-%d")
        
    def generate_unique_thumbnail(self, zip_path, content_hash):
        """Generate a unique thumbnail based on content hash and timestamp"""
        # Create a 256x256 thumbnail with SoulSketch theme
        img = Image.new('RGB', (256, 256), color='#0f0f23')
        draw = ImageDraw.Draw(img)
        
        # Use content hash to generate unique colors and patterns
        hash_int = int(content_hash[:8], 16)
        
        # Generate soul-themed colors from hash
        primary_color = (
            min(255, ((hash_int >> 16) & 0xFF) + 50),  # Ensure brightness
            min(255, ((hash_int >> 8) & 0xFF) + 30),
            min(255, (hash_int & 0xFF) + 80)
        )
        
        # Create ethereal gradient background
        for y in range(256):
            gradient_factor = y / 256
            gradient_color = tuple(
                int(c * (1 - gradient_factor) + 0x23 * gradient_factor) for c in primary_color
            )
            draw.line([(0, y), (256, y)], fill=gradient_color)
        
        # Draw soul-sketch pattern based on hash
        pattern_seed = hash_int % 6
        if pattern_seed == 0:
            # Flowing curves (soul paths)
            for i in range(4):
                points = []
                for j in range(20):
                    x = j * 12 + 20 + (hash_int >> (i*2)) % 40
                    y = 128 + 50 * (hash_int >> (i*3+j)) % 3 - 1
                    points.append((x, y))
                if len(points) > 1:
                    for k in range(len(points)-1):
                        draw.line([points[k], points[k+1]], fill='white', width=2)
        elif pattern_seed == 1:
            # Interconnected nodes (soul network)
            nodes = []
            for i in range(8):
                x = 50 + (hash_int >> (i*4)) % 156
                y = 50 + (hash_int >> (i*4+2)) % 156
                nodes.append((x, y))
                draw.ellipse([x-8, y-8, x+8, y+8], fill='white')
            
            # Connect nodes
            for i in range(len(nodes)):
                for j in range(i+1, min(i+3, len(nodes))):
                    draw.line([nodes[i], nodes[j]], fill='white', width=1)
        else:
            # Geometric soul patterns
            center_x, center_y = 128, 128
            for i in range(6):
                angle = i * 60 + (hash_int >> (i*2)) % 30
                radius = 60 + (hash_int >> (i*3)) % 40
                x = center_x + radius * (hash_int >> (i*4)) % 2 - 1
                y = center_y + radius * (hash_int >> (i*4+1)) % 2 - 1
                draw.line([(center_x, center_y), (x, y)], fill='white', width=2)
        
        # Add SoulSketch branding
        try:
            font = ImageFont.load_default()
        except:
            font = None
            
        # Add labels
        draw.text((10, 10), "SOULSKETCH", fill='white', font=font)
        draw.text((10, 30), "PROTOCOL", fill='white', font=font)
        draw.text((10, 220), self.timestamp, fill='white', font=font)
        draw.text((10, 200), f"Hash: {content_hash[:8]}", fill='white', font=font)
        
        # Save thumbnail
        thumbnail_path = zip_path.with_suffix('.png')
        img.save(thumbnail_path)
        print(f"✅ Generated unique thumbnail: {thumbnail_path.name}")
        return thumbnail_path
        
    def calculate_content_hash(self, files_to_zip):
        """Calculate hash of all content to be zipped"""
        hasher = hashlib.sha256()
        
        for file_path in sorted(files_to_zip):
            if file_path.is_file():
                with open(file_path, 'rb') as f:
                    hasher.update(f.read())
            hasher.update(str(file_path).encode())
            
        return hasher.hexdigest()
        
    def create_zip(self):
        """Create enhanced zip file with timestamp and thumbnail"""
        # Define zip filename with enhanced timestamp
        zip_filename = f"SoulSketch_Protocol_{self.timestamp}.zip"
        zip_path = self.repo_path / zip_filename
        
        # Files to include in the zip
        files_to_include = [
            "README.md",
            "ROADMAP.md",
            "TIMELINE.md",
            "CONTRIBUTING.md",
            "CASSIE_TO_ALICE_UPDATES.md",
            "Ai-chat.md",
            "protocol/",
            "docs/",
            "examples/",
            "philosophy/",
            "templates/",
            "sdk/"
        ]
        
        files_to_zip = []
        for item in files_to_include:
            item_path = self.repo_path / item
            if item_path.exists():
                if item_path.is_file():
                    files_to_zip.append(item_path)
                elif item_path.is_dir():
                    files_to_zip.extend(item_path.rglob('*'))
        
        # Calculate content hash for unique thumbnail
        content_hash = self.calculate_content_hash(files_to_zip)
        
        # Create the zip file
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file_path in files_to_zip:
                if file_path.is_file():
                    arcname = file_path.relative_to(self.repo_path)
                    zipf.write(file_path, arcname)
        
        # Generate unique thumbnail
        thumbnail_path = self.generate_unique_thumbnail(zip_path, content_hash)
        
        # Create metadata file
        metadata = {
            "created": datetime.now().isoformat(),
            "timestamp": self.timestamp,
            "content_hash": content_hash,
            "file_count": len([f for f in files_to_zip if f.is_file()]),
            "zip_size": zip_path.stat().st_size,
            "thumbnail": thumbnail_path.name,
            "project": "SoulSketch Protocol"
        }
        
        metadata_path = zip_path.with_suffix('.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"🎉 Created enhanced SoulSketch protocol pack:")
        print(f"   📦 Zip: {zip_filename}")
        print(f"   🖼️  Thumbnail: {thumbnail_path.name}")
        print(f"   📋 Metadata: {metadata_path.name}")
        print(f"   📊 Files: {metadata['file_count']}")
        print(f"   💾 Size: {metadata['zip_size']:,} bytes")
        print(f"   🔑 Hash: {content_hash[:16]}...")
        
        return zip_path, thumbnail_path, metadata_path

def main():
    repo_path = Path(__file__).parent.parent
    creator = SoulSketchZipCreator(repo_path)
    
    try:
        zip_path, thumbnail_path, metadata_path = creator.create_zip()
        print("\n✅ Enhanced SoulSketch protocol pack created successfully!")
        
        # Clean up old zip files (keep last 5)
        old_zips = sorted(repo_path.glob("SoulSketch_Protocol_*.zip"))
        if len(old_zips) > 5:
            for old_zip in old_zips[:-5]:
                old_zip.unlink(missing_ok=True)
                # Also remove associated files
                old_zip.with_suffix('.png').unlink(missing_ok=True)
                old_zip.with_suffix('.json').unlink(missing_ok=True)
                print(f"🗑️  Cleaned up old file: {old_zip.name}")
                
    except Exception as e:
        print(f"❌ Error creating SoulSketch protocol pack: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
