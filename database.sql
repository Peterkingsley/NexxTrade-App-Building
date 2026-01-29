-- NexxTrade Database Schema
-- Compatible with PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- Nullable if auth is only via social providers initially
    full_name VARCHAR(100),
    username VARCHAR(50) UNIQUE,
    photo_url TEXT,
    telegram_id VARCHAR(255) UNIQUE, -- Added Telegram ID
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'analyst')),
    subscription_plan VARCHAR(20) DEFAULT 'free' CHECK (subscription_plan IN ('free', 'pro', 'elite')),
    subscription_expiry TIMESTAMPTZ,
    referral_code VARCHAR(20) UNIQUE, -- The code this user shares
    referred_by UUID REFERENCES users(id), -- Who referred this user
    wallet_balance DECIMAL(15, 2) DEFAULT 0.00, -- For referral earnings
    is_email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LINKED ACCOUNTS (OAuth)
CREATE TABLE linked_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('google', 'telegram')),
    provider_user_id VARCHAR(255) NOT NULL,
    linked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

-- 3. SIGNALS
CREATE TABLE signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pair VARCHAR(20) NOT NULL, -- e.g. BTC/USDT
    type VARCHAR(20) NOT NULL CHECK (type IN ('Futures', 'Spot')),
    side VARCHAR(10) NOT NULL CHECK (side IN ('Long', 'Short')),
    leverage VARCHAR(20), -- e.g. "10x", "20x", "Cross 50x"
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'cancelled')),
    
    -- Price Data
    entry_price_display VARCHAR(100) NOT NULL, -- Stored as string to handle ranges e.g. "200-205"
    entry_price_min DECIMAL(20, 8), -- For calculation
    entry_price_max DECIMAL(20, 8), -- For calculation
    
    stop_loss_price VARCHAR(100) NOT NULL,
    
    -- Results
    pnl_percentage DECIMAL(8, 2) DEFAULT 0.00,
    max_gain DECIMAL(8, 2) DEFAULT 0.00,
    
    -- Logic & Content
    analysis_text TEXT,
    risk_management_text TEXT,
    chart_image_url TEXT,
    
    -- Access Control
    is_sl_unlocked BOOLEAN DEFAULT TRUE,
    requires_subscription VARCHAR(20) DEFAULT 'free',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) -- Analyst ID
);

-- 4. SIGNAL TARGETS (Take Profits)
CREATE TABLE signal_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signal_id UUID REFERENCES signals(id) ON DELETE CASCADE,
    target_price VARCHAR(50) NOT NULL,
    target_order INTEGER NOT NULL, -- 1, 2, 3
    is_hit BOOLEAN DEFAULT FALSE,
    hit_at TIMESTAMPTZ
);

-- 5. ACADEMY CATEGORIES
CREATE TABLE academy_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

-- 6. ACADEMY ITEMS (Videos/Articles)
CREATE TABLE academy_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES academy_categories(id),
    title VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Article', 'Video')),
    thumbnail_url TEXT,
    author_name VARCHAR(100),
    duration_display VARCHAR(50), -- "5 min read" or "10:00"
    
    -- Content
    description_short TEXT,
    content_html TEXT, -- For Articles
    video_url TEXT, -- For Videos
    
    is_featured BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. USER PROGRESS (Academy)
CREATE TABLE user_academy_progress (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID REFERENCES academy_items(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT FALSE,
    is_bookmarked BOOLEAN DEFAULT FALSE,
    last_position_seconds INTEGER DEFAULT 0, -- For video resume
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, item_id)
);

-- 8. NOTIFICATIONS
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL means Global Announcement
    type VARCHAR(50) NOT NULL CHECK (type IN ('Announcement', 'Signal', 'Academy', 'Account')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link_url TEXT, -- Deep link within app
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. WITHDRAWAL REQUESTS
CREATE TABLE withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    network VARCHAR(50) NOT NULL, -- TRC20, ERC20, etc.
    wallet_address VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processing', 'Completed', 'Rejected')),
    tx_hash VARCHAR(255),
    rejection_reason TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- 10. SYSTEM SETTINGS / APP CONFIG
CREATE TABLE app_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT,
    description TEXT
);

-- 11. PUSH SUBSCRIPTIONS (NEW)
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    keys JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_signals_pair ON signals(pair);
CREATE INDEX idx_signals_status ON signals(status);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id);

-- SEED DATA (Optional Examples)
INSERT INTO academy_categories (name, slug) VALUES 
('Video Courses', 'videos'),
('Trading Guides', 'guides'),
('Resources', 'resources');