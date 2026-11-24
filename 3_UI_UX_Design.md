# KrishiVerse - UI/UX Wireframes & Design System

**Version:** 2.0  
**Date:** April 2026  
**Design System:** Tailwind CSS + DaisyUI  
**Target Audience:** Non-technical farmers (Tamil Nadu)

---

## 1. Design Principles

1. **Simplicity First:** Large buttons, clear icons, minimal text
2. **Accessibility:** 48px touch targets, high contrast (WCAG AA)
3. **Offline-First UI:** Clear indicators for cached vs. live data
4. **Agricultural Context:** Colors & icons aligned to farming (green, soil tones)
5. **Low-Literacy Friendly:** Icons > Text, numbers in regional numerals

---

## 2. Color Palette

```
Primary Colors:
- Green (#22C55E):        Growth, agriculture, positive actions
- Brown (#92400E):        Soil, earth, stability
- Blue (#3B82F6):         Water, trust, information
- Orange (#F97316):       Alert, warning, attention
- Red (#EF4444):          Danger, critical issues

Neutral:
- Dark Gray (#1F2937):    Text, backgrounds
- Light Gray (#F3F4F6):   Surfaces, borders
- White (#FFFFFF):        Main backgrounds

Semantic:
- Success (#10B981):      Disease treatment, positive outcomes
- Warning (#FBBF24):      Weather alerts, caution
- Error (#EF4444):        Diseases, pest issues
- Info (#60A5FA):         Tips, information
```

---

## 3. Typography

```
Font: System Sans-serif (Roboto for Android, San Francisco for iOS)

Scale:
- Display (H1):      32px, Bold (700)   → Page titles
- Heading 2 (H2):    24px, Bold (600)   → Section headers
- Heading 3 (H3):    20px, Bold (600)   → Card titles
- Body Large:        16px, Regular (400) → Main text
- Body Small:        14px, Regular (400) → Labels, descriptions
- Caption:           12px, Regular (400) → Helper text, timestamps

Line Height:
- Headings: 1.2
- Body: 1.6
```

---

## 4. Component Library (DaisyUI-based)

### 4.1 Buttons

```
Primary Button (Green):
  - Color: #22C55E
  - Padding: 12px 20px
  - Border-radius: 8px
  - Font-size: 16px
  - Min-height: 48px (touch target)
  - Usage: Main actions (Ask, Diagnose, Submit)

Secondary Button (Gray):
  - Color: #D1D5DB
  - Usage: Back, Cancel, Optional actions

Danger Button (Red):
  - Color: #EF4444
  - Usage: Delete, Logout

Icon Button (Circular):
  - Size: 48x48px
  - Usage: Maps, Navigation
```

### 4.2 Input Fields

```
Text Input:
  - Height: 48px
  - Padding: 12px 16px
  - Border: 2px solid #E5E7EB
  - Focus: Border #22C55E (green)
  - Font: 16px
  - Label above input, 14px

Dropdown:
  - Height: 48px
  - Show only 3-4 options (radio buttons for more)
  - Usage: Crop type, language selection

Radio Button:
  - Size: 24px
  - Spacing: 16px between options
  - Label: 16px, to the right
  - Usage: Crop selection, payment methods

Checkbox:
  - Size: 24px
  - Label: 16px, to the right
```

### 4.3 Cards

```
Weather Card:
  - Height: 120px
  - Padding: 16px
  - Shadow: 2px 4px 8px rgba(0,0,0,0.1)
  - Image: Top 60px (weather icon)
  - Text: Temperature (24px), Condition (14px)

Shop Card:
  - Height: 140px
  - Left 40px: Distance, image
  - Right: Shop name (16px), Address (12px), Phone (12px, link)
  - Bottom: Rating (⭐ 4.5)

Disease Result Card:
  - Top: Disease name (24px bold)
  - Middle: Confidence (14px) + Severity (14px)
  - Bottom: Treatment (16px) + Learn more button
  - Color-coded: Green (healthy), Orange (mild), Red (severe)
```

### 4.4 Navigation

```
Bottom Navigation Bar:
  - Height: 64px
  - Fixed at bottom
  - 5 tabs: Home, Ask, Diagnose, Weather, Menu
  - Icons: 24px, labeled (12px)
  - Active: Green (#22C55E), Inactive: Gray
  - Padding: 8px top/bottom

Tab Bar (Within page):
  - Height: 48px
  - Underline style
  - Active: Green (#22C55E)
```

---

## 5. Page Wireframes

### 5.1 HOME PAGE

```
┌─────────────────────────────────────┐
│ KrishiVerse    [☰ Menu]    [⚙️]    │  ← Header (48px)
├─────────────────────────────────────┤
│                                     │
│  🌤️ 28°C  Mostly Sunny            │  ← Weather Card (120px)
│  Humidity: 65%  Wind: 12 km/h      │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Quick Actions:                     │
│                                     │
│  [🌾 Ask Farmer]    [📸 Diagnose]  │  ← 2 column button grid (96px)
│  [📊 Prices]        [🗺️ Maps]      │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Recent Activity:                   │
│                                     │
│  📸 Leaf Spot Detected             │  ← Activity item (60px)
│     Yesterday                       │
│                                     │
│  💬 "How to water sugarcane?"      │
│     3 days ago                      │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Government Schemes (See All →)    │  ← Section header
│                                     │
│  ✓ PM-KISAN: ₹500 available       │  ← Scheme card (70px)
│  ✓ PMKSY: Apply before June 30    │
│                                     │
├─────────────────────────────────────┤
│ [↓] Offline - Last synced 2h ago   │  ← Offline indicator (40px)
└─────────────────────────────────────┘
```

### 5.2 ASK PAGE (Chatbot)

```
┌─────────────────────────────────────┐
│ Ask Farmer        [⌨️ Voice]        │  ← Header
├─────────────────────────────────────┤
│                                     │
│ 📝 Chat History:                   │  ← Tab toggle (48px)
│                                     │
│ ┌───────────────────────────────┐  │
│ │ Q: When to plant rice?        │  │  ← User message
│ │ By: You, 3 days ago           │  │
│ └───────────────────────────────┘  │
│                                     │
│ ┌───────────────────────────────┐  │
│ │ A: Plant rice in June for TN  │  │  ← AI response
│ │ 📌 Offline   👍 Useful        │  │  ← Feedback buttons
│ └───────────────────────────────┘  │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ Type your question:                 │
│                                     │
│ [____________________________________]  ← Text input (48px)
│                                     │
│ [Crop Type ▼]  [Language ▼]       │  ← Filters (48px)
│                                     │
│          [🎤 Ask] [📤 Send]        │  ← Buttons (48px)
│                                     │
├─────────────────────────────────────┤
│ ℹ️ Local model (offline)            │  ← Model indicator
│ or                                  │
│ ☁️ Claude AI (online, premium)      │
└─────────────────────────────────────┘
```

### 5.3 DIAGNOSE PAGE (Disease Detection)

```
┌─────────────────────────────────────┐
│ Diagnose Disease                    │  ← Header
├─────────────────────────────────────┤
│                                     │
│  📸 Upload Leaf Image:              │  ← Instructions (text)
│                                     │
│  [+]                                │  ← Large upload button (120x120px)
│  Tap to take/upload photo           │  ← Instructions below
│                                     │
├─────────────────────────────────────┤
│ Selected:                           │
│ [🖼️ leaf_1.jpg] [✕]                 │  ← Selected image preview (80px)
│ [🖼️ leaf_2.jpg] [✕]                 │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  [🔍 Analyze Images] (primary)     │  ← Action button (48px)
│                                     │
├─────────────────────────────────────┤
│                                     │
│  🌾 Results:                        │  ← Results section
│                                     │
│  Disease: Early Blight             │  ← Disease name (20px bold)
│  Confidence: 87% 🟢                 │  ← Confidence (14px)
│  Severity: Moderate                 │  ← Severity (14px, color-coded)
│                                     │
│  Treatment:                         │  ← Treatment section
│  Spray Carbendazim 50 WP            │  ← Recommendation (16px)
│  Dose: 1g per liter water           │
│  Interval: 10-12 days               │
│                                     │
│  [📖 Learn More] [➕ Add to List]   │  ← Action buttons (48px)
│                                     │
│ 📌 Local model (Offline)            │  ← Model indicator
│                                     │
└─────────────────────────────────────┘
```

### 5.4 WEATHER PAGE

```
┌─────────────────────────────────────┐
│ 7-Day Weather  [📍 Change Location] │  ← Header
├─────────────────────────────────────┤
│                                     │
│  Today: Coimbatore                  │  ← Location (14px)
│                                     │
│  28°C / 18°C                        │  ← Temp range (24px)
│  🌤️ Mostly Sunny                   │  ← Condition with icon (14px)
│  Humidity: 65%  Wind: 12 km/h       │
│  Rainfall: 2 mm                     │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  7-Day Forecast:                    │  ← Section header
│                                     │
│  Tomorrow:  26°C  🌥️ Cloudy        │  ← Forecast item (48px)
│  Day 3:     25°C  🌧️ Rainy  Alert! │  ← Alert indicator
│  Day 4:     27°C  ☀️  Sunny         │
│  Day 5:     24°C  ⛈️  Stormy  ⚠️    │  ← Warning icon
│  Day 6:     26°C  🌤️ Sunny         │
│  Day 7:     28°C  ☀️  Sunny         │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Farming Advice:                    │  ← Advice section
│                                     │
│  ✓ Good day to spray (low wind)    │  ← Positive (green icon)
│  ⚠️ Don't plant in next 2 days      │  ← Warning (orange icon)
│                                     │
│  [Learn More]                       │  ← Link button (48px)
│                                     │
│ 📌 Cached (Last updated 2h ago)     │  ← Cache indicator (12px)
│                                     │
└─────────────────────────────────────┘
```

### 5.5 MANDI PRICES PAGE

```
┌─────────────────────────────────────┐
│ Mandi Prices                        │  ← Header
├─────────────────────────────────────┤
│                                     │
│  Crop: [Rice ▼]  Mandi: [All ▼]   │  ← Filters (48px)
│                                     │
│  📊 Price Trend (7 days):           │  ← Chart section
│  [Chart visualization]              │  ← Line graph (200px height)
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Today's Prices:                    │  ← Prices section
│                                     │
│  Coimbatore Mandi:                  │  ← Mandi name (14px)
│  ₹4,250 per quintal                 │  ← Price (20px bold)
│  Volume: 500 Q  ↑ +2%               │  ← Volume + trend (12px)
│                                     │
│  Salem Mandi:                       │
│  ₹4,180 per quintal                 │
│  Volume: 320 Q  ↓ -1%               │
│                                     │
│  Chennai Mandi:                     │
│  ₹4,300 per quintal                 │
│  Volume: 450 Q  → +0%               │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  [⏰ Set Price Alert] [📌 Favorite] │  ← Action buttons (48px)
│                                     │
│ 📌 Cached (Daily at 7 AM)           │  ← Cache indicator
│                                     │
└─────────────────────────────────────┘
```

### 5.6 MAPS PAGE (Shop Locator)

```
┌─────────────────────────────────────┐
│ Nearby Shops  [🔍]  [Filters ≡]    │  ← Header (48px)
├─────────────────────────────────────┤
│                                     │
│ ┌───────────────────────────────┐  │
│ │                               │  │
│ │    [Interactive Map]          │  │  ← Leaflet.js map (300px)
│ │    • 🍃 Fertilizer           │  │
│ │    🌾 Drone Services         │  │
│ │    🏪 Input Center            │  │
│ │                               │  │
│ │    [Your location 📍]        │  │
│ │                               │  │
│ └───────────────────────────────┘  │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Nearby (1-5 km):                   │  ← Distance filter (14px)
│                                     │
│  🍃 Krishnan Fertilizers            │  ← Shop card (100px)
│  ⭐⭐⭐⭐⭐ (45 reviews)             │
│  📍 2.3 km away (5 min)             │
│  📞 9876543210  🔗 Open             │
│  🕐 9 AM - 6 PM                     │
│                                     │
│  🌾 AgroTech Drone Services         │
│  ⭐⭐⭐⭐ (12 reviews)               │
│  📍 3.5 km away (10 min)            │
│  📞 9123456789  🔗 Open             │
│                                     │
│  🏪 Vegetable Seeds Center          │
│  ⭐⭐⭐⭐⭐ (23 reviews)             │
│  📍 4.1 km away (12 min)            │
│                                     │
│  [See All →]                        │
│                                     │
├─────────────────────────────────────┤
│  Type: [Fertilizer ▼]  [Clear]      │  ← More filters (48px)
│                                     │
│  ☐ Fertilizers  ☐ Seeds            │  ← Checkbox filters
│  ☐ Drone Services  ☐ Govt Office   │
│                                     │
└─────────────────────────────────────┘
```

### 5.7 GOVERNMENT SCHEMES PAGE

```
┌─────────────────────────────────────┐
│ Government Schemes                  │  ← Header
├─────────────────────────────────────┤
│                                     │
│  [Subsidy ▼]  [Category ▼]         │  ← Filters (48px)
│                                     │
│  PM-KISAN                           │  ← Scheme card (120px)
│  Direct support to farmers          │
│  💰 ₹6,000/year                     │
│  📅 Apply anytime                   │
│  Status: ✓ You may be eligible     │
│  [Learn More →]                     │
│                                     │
│  PMKSY (Prime Minister Krishi       │
│  Sinchayee Yojana)                  │
│  Irrigation & water conservation    │
│  💰 80% subsidy                     │
│  📅 Deadline: June 30, 2024         │
│  Status: ⚠️ Check eligibility      │
│  [Check Now] [Learn More →]         │
│                                     │
│  Pradhan Mantri Fasal Bima Yojana  │
│  Crop insurance scheme              │
│  💰 Premium varies                  │
│  📅 Apply: June-July                │
│  Status: ℹ️  Information only       │
│  [Learn More →]                     │
│                                     │
│  [See All 15+ Schemes →]            │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  How to Apply (PM-KISAN):           │  ← Expanded section
│                                     │
│  Step 1: Check eligibility          │  ← Steps (numbered)
│  [Start Eligibility Check →]        │
│                                     │
│  Step 2: Register on ekyc           │
│  [📹 Watch Video] [📄 PDF Guide]    │  ← Media links (48px)
│                                     │
│  Step 3: Submit application         │
│  Contact: 1800-180-1551             │
│  Website: pmkisan.gov.in            │
│                                     │
│  [Print Application] [Help]         │
│                                     │
└─────────────────────────────────────┘
```

### 5.8 SETTINGS PAGE

```
┌─────────────────────────────────────┐
│ Settings                            │
├─────────────────────────────────────┤
│                                     │
│  👤 Profile                         │  ← Section header
│                                     │
│  Name: [Rajeesh Kumar]              │  ← Editable field
│  Location: [Coimbatore ▼]          │
│  Crop Types: [Rice, Sugarcane]     │
│                                     │
│  [Edit Profile]                     │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  🌐 Language                        │  ← Language section
│                                     │
│  ◉ Tamil (தமிழ்)                   │  ← Radio buttons (48px)
│  ○ English                          │
│  ○ Telugu (తెలుగు)                 │
│  ○ Kannada (ಕನ್ನಡ)                 │
│  ○ Hindi (हिन्दी)                   │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  🔔 Notifications                   │  ← Toggles (48px)
│                                     │
│  🔘 Weather Alerts                  │
│  🔘 Price Alerts                    │
│  🔘 Pest Warnings                   │
│  ⚪ Scheme Updates                   │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  💾 Data & Storage                  │  ← Storage section
│                                     │
│  App Size: 18.2 MB                  │  ← Info (12px)
│  Cached Data: 42 MB                 │
│  Last Sync: 2 hours ago             │
│                                     │
│  [Clear Cache]  [Force Sync]        │  ← Buttons (48px)
│                                     │
├─────────────────────────────────────┤
│                                     │
│  ℹ️  About                          │
│                                     │
│  KrishiVerse v2.0                   │
│  Built by CodeNest                  │
│  © 2024 All rights reserved         │
│                                     │
│  [Privacy Policy]  [Terms]          │
│  [Contact Support]                  │
│                                     │
│         [Logout]                    │  ← Logout button (danger)
│                                     │
└─────────────────────────────────────┘
```

---

## 6. Responsive Breakpoints

```
Mobile (default):   320px - 480px
Tablet:            481px - 768px
Desktop (future):  769px +

Current focus: Mobile (320px minimum)
- Single column layouts
- Bottom navigation
- Full-width cards
```

---

## 7. Accessibility Features

```
✓ Touch targets: 48px minimum
✓ Text size: 14px minimum (16px body)
✓ Color contrast: WCAG AA (4.5:1 for text)
✓ Screen reader support: ARIA labels
✓ Offline indicators: Clear visual + text
✓ Error messages: Clear, constructive
✓ Form labels: Always visible, associated with inputs
✓ Focus indicators: Visible 3px outline
✓ Regional numerals: Support for Tamil numerals (future)
```

---

## 8. Dark Mode Support

```
Primary changes:
- Background: White → Dark Gray (#1F2937)
- Text: Dark Gray → White
- Cards: White → Darker Gray (#111827)
- Buttons: Same colors (auto-adjust contrast)
- Icons: Auto-invert for visibility

Implementation: Tailwind's `dark:` prefix
```

---

## 9. Animation Guidelines

```
Smooth transitions: 200-300ms
Easing: ease-in-out

Examples:
- Button hover: Slight scale + color change (200ms)
- Tab switch: Fade in/out (200ms)
- Data loading: Skeleton loading (subtle pulse)
- Offline indicator: Slide down (300ms)
- Disease result: Scale up + fade (300ms)

Principle: Keep it subtle, reduce motion for accessibility
```

---

## 10. Error & Loading States

```
Loading State:
- Skeleton loaders (matching content shape)
- Pulse animation (subtle)
- Loading text: "Loading..." + spinner

Error State:
- Error icon (red)
- Clear error message (16px)
- Retry button (primary green)
- Contact support link

Offline State:
- Banner at bottom: "📌 Offline - Last synced 2h ago"
- Cached data marked: "Cached"
- Actions disabled: Grayed out
- Sync button visible: "Force Sync"

Success State:
- Green checkmark
- Confirmation message
- Auto-dismiss after 3s
```

---

## 11. Form Validation

```
On Focus:
- Border color: Green (#22C55E)
- Helper text visible

On Blur (Invalid):
- Border color: Red (#EF4444)
- Error message below field (12px red)
- Shake animation (100ms)

On Blur (Valid):
- Green checkmark icon
- No error message

Example:
Name field error: "Name must be at least 2 characters"
```

---

## 12. Image Optimization

```
Weather Icons:
- SVG format (2-5 KB each)
- Color: Auto-match theme
- Size: 64x64px (scalable)

Shop Photos:
- WebP format (compressed)
- Thumbnail: 80x80px (8 KB)
- Full: 300x300px (40 KB, lazy load)

Disease Images:
- JPEG progressive
- Max: 5 MB per image
- Resize: 224x224px for model

Resources:
- Icons: Tabler Icons (free, open)
- Weather: Custom SVG
```

---

## 13. Component Specs (DaisyUI)

**Button Sizes:**
- Small: 36px height, 12px font, 8px padding
- Medium: 48px height, 16px font, 12px padding
- Large: 56px height, 18px font, 16px padding

**Card Sizes:**
- Compact: 100px height
- Medium: 140px height
- Large: 200px height

**Input Sizes:**
- All: 48px height (touch-friendly)
- Padding: 12px (internal)
- Font: 16px (prevents auto-zoom on iOS)

---

## 14. Navigation Structure

```
Bottom Tab Navigation:
1. Home (🏠)
2. Ask (💬)
3. Diagnose (📸)
4. Weather (🌤️)
5. More (≡)
   - Mandi Prices (💰)
   - Maps (🗺️)
   - Schemes (📋)
   - Drone (🚁)
   - Settings (⚙️)
```

---

## 15. Localization Notes

**Tamil Considerations:**
- Font: Support Tamil Unicode (U+0B80-U+0BFF)
- Direction: LTR (Tamil written left-to-right)
- Numbers: Support Tamil numerals (௦-௯) in settings
- Date format: DD/MM/YYYY (Indian standard)
- Currency: ₹ (Indian Rupee)

**Regional Language Preferences:**
- Default: Tamil
- Fallback: English
- All UI strings in JSON translation files (i18next)

---

## 16. Prototype Links

(Placeholder for Figma/Adobe XD links)
- Desktop prototype: [Link]
- Mobile prototype: [Link]
- Interactive demo: [Link]

---

**Design System Owner:** CodeNest Design Team  
**Last Updated:** April 2026  
**Status:** Production Ready
