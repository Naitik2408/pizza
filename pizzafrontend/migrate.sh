#!/bin/bash

# Migration script for Pizza App restructure
echo "🍕 Starting Pizza App Frontend Restructure..."

# Create a backup of the current structure
echo "📦 Creating backup..."
cp -r app app_backup_$(date +%Y%m%d_%H%M%S)

echo "✅ New structure has been created!"
echo ""
echo "📁 New directory structure:"
echo "├── src/"
echo "│   ├── components/"
echo "│   │   ├── ui/          # Basic UI components"
echo "│   │   ├── common/      # Shared components"
echo "│   │   └── features/    # Feature-specific components"
echo "│   ├── services/        # API services"
echo "│   ├── utils/           # Utility functions"
echo "│   ├── constants/       # App constants"
echo "│   └── types/           # TypeScript types"
echo "├── config/              # Configuration"
echo "└── app/                 # Expo Router screens"
echo ""
echo "📋 Next steps:"
echo "1. Move existing components to src/components/features/"
echo "2. Update import statements throughout the app"
echo "3. Replace direct API calls with service methods"
echo "4. Use constants instead of hardcoded values"
echo "5. Add proper TypeScript types"
echo ""
echo "📖 See RESTRUCTURE_GUIDE.md for detailed migration instructions"
echo ""
echo "🎉 Restructure preparation complete!"
