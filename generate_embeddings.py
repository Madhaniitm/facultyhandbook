#!/usr/bin/env python3
"""
Generate embeddings for semantic search
Runs during Jekyll build to create search-embeddings.json
Uses sentence-transformers for zero-cost, offline embeddings
"""

import json
import os
from pathlib import Path
from sentence_transformers import SentenceTransformer

def load_search_data():
    """Load existing search data from Jekyll build"""
    search_data_path = Path('_site/assets/js/search-data.json')

    if not search_data_path.exists():
        print("❌ Error: search-data.json not found. Run 'bundle exec jekyll build' first!")
        return None

    with open(search_data_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def generate_embeddings(search_data):
    """Generate embeddings for all pages"""
    print("🚀 Loading embedding model (all-MiniLM-L6-v2)...")
    print("   (First run will download ~90MB model, then cached)")

    # Load lightweight, fast model
    model = SentenceTransformer('all-MiniLM-L6-v2')

    print(f"\n📝 Generating embeddings for {len(search_data)} pages...")

    embeddings_data = []

    for i, page in enumerate(search_data, 1):
        # Combine title and content for better semantic understanding
        text = f"{page['title']} {page.get('content', '')}"

        # Generate embedding (384-dimensional vector)
        embedding = model.encode(text).tolist()

        embeddings_data.append({
            'id': page['id'],
            'title': page['title'],
            'url': page['url'],
            'content': page.get('content', ''),
            'heading': page.get('heading', ''),
            'embedding': embedding
        })

        print(f"   [{i}/{len(search_data)}] {page['title']}")

    return embeddings_data

def save_embeddings(embeddings_data):
    """Save embeddings to JSON file"""
    output_path = Path('_site/assets/js/search-embeddings.json')
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(embeddings_data, f, ensure_ascii=False)

    # Calculate file size
    size_kb = output_path.stat().st_size / 1024
    print(f"\n✅ Embeddings saved to: {output_path}")
    print(f"   File size: {size_kb:.1f} KB")

def main():
    print("=" * 60)
    print("🔍 Semantic Search Embedding Generator")
    print("=" * 60)

    # Load search data
    search_data = load_search_data()
    if not search_data:
        return

    # Generate embeddings
    embeddings_data = generate_embeddings(search_data)

    # Save to file
    save_embeddings(embeddings_data)

    print("\n" + "=" * 60)
    print("✨ Done! Embeddings are ready for semantic search")
    print("=" * 60)
    print("\nNext steps:")
    print("  1. Embeddings are now in _site/assets/js/search-embeddings.json")
    print("  2. Chatbot will automatically use them for semantic search")
    print("  3. Re-run this script whenever you update content")

if __name__ == '__main__':
    main()
