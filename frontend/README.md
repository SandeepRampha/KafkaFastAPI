# KafkaManager UI

A modern, high-performance web interface for managing Kafka clusters. Built with React, TypeScript, and Vite, featuring a real-time responsive dashboard for both Admin and User personas.

## 🚀 Key Features

- **Real-time Topic Management**: Create, alter, and delete topics with optimistic UI updates and background metadata synchronization.
- **Request Lifecycle**: Integrated approval workflow for Topic and ACL requests between Users and Admins.
- **ACL Management**: Comprehensive Access Control List management with granular filtering and "Handled" status tracking.
- **Intelligent Filtering**: Advanced Key-Value filtering system across all catalogs and request tables.
- **Premium UX/UI**:
  - **Glassmorphism Design**: Modern, sleek aesthetics with a focus on visual excellence.
  - **Split Loading States**: Differentiates between initial page load (skeleton) and background syncs (silent updates) for a flicker-free experience.
  - **Dynamic Interactivity**: Hover effects, micro-animations, and responsive layouts.
  - **Dark/Light Mode**: Full support for both themes with seamless transitions.

## 🛠️ Tech Stack

- **Framework**: React 18 with Vite
- **Language**: TypeScript
- **Styling**: Vanilla CSS + Tailwind CSS (where applicable)
- **Icons**: Lucide React
- **State Management**: React Hooks (useState, useEffect, useMemo)
- **Data Table**: @tanstack/react-table
- **HTTP Client**: Axios with interceptors for JWT Auth

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Configuration

Create a `.env` file in the root directory with Fast API URL:
```env
VITE_API_URL=http://localhost:8000
```

## 📂 Project Structure

- `src/pages/admin`: Administrative dashboards for cluster-wide management.
- `src/pages/user`: Self-service catalogs and request management for developers.
- `src/components/ui`: Highly reusable, premium UI components (Modals, Buttons, DataTables).
- `src/services`: API interaction layer with backend services.
- `src/hooks`: Custom React hooks for shared logic (filtering, debouncing, etc.).

## 🧪 Development Workflow

1. **Optimistic Updates**: Always update the local state immediately for actionable items to ensure the UI feels instantaneous.
2. **Background Sync**: Use `sync...Silently` patterns to keep metadata fresh without disrupting user focus (e.g., in `AdminTopics.tsx`).
3. **Consistency Handling**: Kafka operations are eventually consistent; utilize retry logic where necessary to verify state changes post-operation.
