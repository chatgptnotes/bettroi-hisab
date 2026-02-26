# Bettroi Hisab - Account Tracker

Financial transaction tracker for Bettroi software projects. This app tracks all money flows between Bettroi (software agency that brings clients) and Dr. Murali's team (who develop the projects).

## 🚀 Features

### Dashboard
- Summary cards: Total Billed, Total Received, Pending Receivable
- Recent transactions overview
- Financial health at a glance

### Projects Management
- List all Bettroi projects with status tracking
- Total value, amount received, and balance for each project
- Status indicators: Active, Completed, Pending, In Process
- Click-through to detailed project views

### Transaction Management
- Add new transactions with project linking
- Transaction types: Bill Sent, Payment Received, Invoice, Advance, By Hand
- Payment modes: Cash, Bank, UPI, By Hand, Cheque, Other
- Full transaction history with filtering

### Project Details
- Complete project overview with financials
- Transaction history per project
- Milestone tracking with percentage and amount
- Action items with due dates
- Project notes and status

### Milestone Tracker
- Per-project milestones with completion percentage
- Amount allocation per milestone
- Status tracking: Pending, Invoiced, Paid
- Due date management

### Reports & Analytics
- Monthly trend charts (billed vs received)
- Project value distribution
- Collection rate analysis
- Project performance table with progress bars

## 🛠 Tech Stack

- **Frontend:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS with dark theme
- **Backend:** Supabase (PostgreSQL)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Routing:** React Router DOM
- **Deployment:** Vercel

## 🎨 Design

- **Theme:** Dark theme (slate-950 background) with emerald/green accents
- **Mobile-friendly:** Responsive design optimized for mobile use
- **Professional:** Financial dashboard aesthetic
- **Color coding:** Green for received, Red for pending, Yellow for in-process

## 📊 Pre-populated Data

The app comes with sample data based on Dr. Murali's handwritten notes:

### Projects
- **Linkist:** ₹2,40,000 (₹2,00,000 received, ₹40,000 billed)
- **Neuro (Neurosense):** ₹2,75,000 with milestone structure
  - M1: 40% = ₹1,10,000 (Paid)
  - M2: 20% = ₹55,000 (Pending)
  - M3: 30% = ₹82,500 (Pending)
  - M4: 10% = ₹27,500 (Pending)
- **4C:** ₹1,50,000 (₹50,000 received)
- **Headz:** Pending PO from Harita
- **Various:** ₹2,80,000 received by hand

### Action Items
- Headz: Send invoice for advance by 15th Jan
- Neuro: Follow up to get advance
- Linkist: Send invoice ✓

## 🚀 Quick Start

### 1. Setup Database

Visit `/setup` on the deployed app to initialize the database with sample data.

This will create all necessary Supabase tables and populate them with the pre-defined project data.

### 2. Database Schema

```sql
-- Projects table
CREATE TABLE bettroi_projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  total_value numeric DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'pending', 'in_process')),
  client_name text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Transactions table
CREATE TABLE bettroi_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES bettroi_projects(id),
  date date NOT NULL DEFAULT CURRENT_DATE,
  type text NOT NULL CHECK (type IN ('bill_sent', 'payment_received', 'invoice', 'advance', 'by_hand')),
  amount numeric NOT NULL,
  mode text CHECK (mode IN ('cash', 'bank', 'upi', 'by_hand', 'cheque', 'other')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Milestones table
CREATE TABLE bettroi_milestones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES bettroi_projects(id),
  name text NOT NULL,
  percentage numeric,
  amount numeric,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced', 'paid')),
  due_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Action items table
CREATE TABLE bettroi_action_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES bettroi_projects(id),
  description text NOT NULL,
  due_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  created_at timestamptz DEFAULT now()
);
```

## 🔧 Development

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/chatgptnotes/bettroi-hisab.git
cd bettroi-hisab

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Environment Variables

The app uses Supabase with the following configuration (already included):

```
SUPABASE_URL=https://bvaefzcsgtgqwftczixb.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2YWVmemNzZ3RncXdmdGN6aXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0NTMyNjAsImV4cCI6MjA1MzAyOTI2MH0.Q-AxSMpO6lKogtR_m0j2CvpzdRiDpZiKebR8XCPq1Nc
```

## 📱 Usage

### Adding Transactions
1. Navigate to "Add Transaction" 
2. Select project, date, and transaction type
3. Enter amount and payment mode
4. Add optional notes
5. Save transaction

### Viewing Project Details
1. Go to "Projects" page
2. Click "View" on any project
3. See complete financial overview, milestones, and action items

### Generating Reports
1. Visit "Reports" page
2. View monthly trends and project distribution
3. Analyze collection rates and project performance

## 🌐 Deployment

The app is configured for automatic deployment on Vercel:

- **Repository:** https://github.com/chatgptnotes/bettroi-hisab
- **Live Demo:** Will be available after Vercel deployment completes
- **Auto-deploy:** Enabled on push to master branch

## 📄 License

This project is private and intended for internal use by Bettroi and Dr. Murali's team.

## 🤝 Contributing

Internal project - contact the development team for contributions.

---

**Built with ❤️ for efficient financial tracking of Bettroi projects**