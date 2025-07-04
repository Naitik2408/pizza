# Pizza App - Restructured Frontend

## New Folder Structure

This React Native/Expo app has been restructured to follow modern best practices and improve maintainability.

### Directory Structure

```
pizzafrontend/
├── app/                          # App Router (Expo Router)
│   ├── (auth)/                   # Authentication screens
│   ├── (tabs)/                   # Main user interface
│   ├── admin/                    # Admin interface
│   ├── delivery/                 # Delivery agent interface
│   ├── _layout.tsx              # Root layout
│   └── +not-found.tsx          # 404 page
├── src/                          # Source code
│   ├── components/               # Reusable components
│   │   ├── common/              # Common/shared components
│   │   ├── forms/               # Form-specific components
│   │   ├── ui/                  # Basic UI components (Button, Input, etc.)
│   │   └── features/            # Feature-specific components
│   │       ├── admin/           # Admin-specific components
│   │       ├── cart/            # Cart-related components
│   │       ├── menu/            # Menu-related components
│   │       └── orders/          # Order-related components
│   ├── services/                # API and external services
│   │   ├── api.ts              # Base API client
│   │   ├── auth.ts             # Authentication service
│   │   ├── menu.ts             # Menu service
│   │   ├── order.ts            # Order service
│   │   └── index.ts            # Service exports
│   ├── utils/                   # Utility functions
│   │   ├── validation.ts        # Form validation utilities
│   │   ├── formatting.ts        # Data formatting utilities
│   │   ├── storage.ts           # AsyncStorage helpers
│   │   ├── helpers.ts           # General helper functions
│   │   └── index.ts            # Utility exports
│   ├── constants/               # App constants
│   │   └── index.ts            # Colors, sizes, API endpoints, etc.
│   └── types/                   # TypeScript type definitions
│       └── index.ts            # All type definitions
├── assets/                      # Static assets (images, sounds, etc.)
├── redux/                       # Redux store and slices
├── config/                      # Configuration files
│   └── index.ts                # API URLs and environment config
├── hooks/                       # Custom React hooks
└── ...other root files
```

## Key Improvements

### 1. **Separation of Concerns**
- **UI Components**: Reusable, styled components in `src/components/ui/`
- **Feature Components**: Business logic components organized by feature
- **Services**: All API calls centralized in service layer
- **Utilities**: Helper functions separated by purpose

### 2. **TypeScript Support**
- Comprehensive type definitions in `src/types/`
- Strongly typed API responses and component props
- Better IDE support and error catching

### 3. **Constants Management**
- All app constants (colors, sizes, API endpoints) in one place
- Easy theming and configuration changes
- Consistent styling across the app

### 4. **Service Layer**
- Centralized API client with error handling
- Feature-specific services (auth, menu, orders)
- Token management and request interceptors

### 5. **Utility Functions**
- Form validation helpers
- Data formatting utilities
- Storage management
- Common helper functions

## Component Organization

### UI Components (`src/components/ui/`)
Basic, reusable components:
- `Button.tsx` - Styled button with variants
- `Input.tsx` - Form input with validation
- `Card.tsx` - Container component
- `Modal.tsx` - Modal/overlay component

### Feature Components (`src/components/features/`)
Business logic components organized by feature:
- `admin/` - Admin-specific components
- `cart/` - Cart and checkout components
- `menu/` - Menu display and selection
- `orders/` - Order tracking and history

### Common Components (`src/components/common/`)
Shared components used across features:
- `LoadingSpinner.tsx`
- `ErrorBoundary.tsx`
- `EmptyState.tsx`

## Migration Guide

### Updating Imports
Old imports need to be updated to use the new structure:

```typescript
// Old
import { API_URL } from '@/config';

// New
import { API_URL } from '@/config';
// OR
import { API_URL } from '../../config';

// Old
import { validateEmail } from '../utils/validation';

// New
import { validateEmail } from '@/src/utils';
```

### Using Services
Replace direct fetch calls with service methods:

```typescript
// Old
const response = await fetch(`${API_URL}/api/orders/my-orders`, {
  headers: { Authorization: `Bearer ${token}` }
});

// New
import { orderService } from '@/src/services';
const response = await orderService.getMyOrders();
```

### Using Constants
Replace hardcoded values with constants:

```typescript
// Old
backgroundColor: '#F97316'

// New
import { COLORS } from '@/src/constants';
backgroundColor: COLORS.primary
```

## Best Practices

### 1. **Component Structure**
```typescript
// Component template
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '@/src/constants';
import type { ComponentProps } from '@/src/types';

interface Props extends ComponentProps {
  // Component-specific props
}

export const ComponentName: React.FC<Props> = ({ ...props }) => {
  return (
    <View style={styles.container}>
      {/* Component content */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Use constants for consistent styling
    backgroundColor: COLORS.background,
    padding: SIZES.padding.md,
  },
});
```

### 2. **Service Usage**
```typescript
// Always use try-catch with services
import { authService } from '@/src/services';

const handleLogin = async (credentials) => {
  try {
    const response = await authService.login(credentials);
    if (response.success) {
      // Handle success
    } else {
      // Handle error
    }
  } catch (error) {
    // Handle network/unexpected errors
  }
};
```

### 3. **Type Safety**
```typescript
// Use defined types
import type { User, Order } from '@/src/types';

interface Props {
  user: User;
  orders: Order[];
}
```

## Environment Setup

1. Update import paths in `tsconfig.json` for path mapping
2. Update Metro config if needed for new paths
3. Update any build scripts that reference old paths

## Next Steps

1. **Move existing components** to new structure
2. **Update all import statements** throughout the app
3. **Replace direct API calls** with service methods
4. **Use constants** instead of hardcoded values
5. **Add proper TypeScript types** to all components
6. **Test thoroughly** after migration

This restructure provides a solid foundation for scaling the application and makes it easier for new developers to understand and contribute to the codebase.
