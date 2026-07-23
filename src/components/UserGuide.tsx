import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Search,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Sparkles,
  Calculator,
  ShoppingCart,
  Users,
  Receipt,
  Cloud,
  BarChart3,
  Moon,
  ShieldCheck,
  X,
  FileText,
  Lightbulb,
  Store,
  QrCode,
  PackageCheck,
  TrendingUp,
  History,
  Info,
  DollarSign,
  Smartphone,
  Eye,
  Plus
} from 'lucide-react';

interface UserGuideProps {
  isBangla: boolean;
  onClose?: () => void;
  isModalMode?: boolean;
}

interface GuideSection {
  id: string;
  icon: React.ElementType;
  titleBn: string;
  titleEn: string;
  badgeBn: string;
  badgeEn: string;
  color: string;
  descriptionBn: string;
  descriptionEn: string;
  stepsBn: {
    title: string;
    detail: string;
    tip?: string;
  }[];
  stepsEn: {
    title: string;
    detail: string;
    tip?: string;
  }[];
}

export default function UserGuide({ isBangla, onClose, isModalMode = false }: UserGuideProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [openAccordion, setOpenAccordion] = useState<string | null>('overview');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const guideSections: GuideSection[] = [
    {
      id: 'overview',
      icon: Store,
      titleBn: '১. অ্যাপ পরিচিতি ও প্রাথমিক সেটআপ',
      titleEn: '1. Overview & Basic Setup',
      badgeBn: 'শুরুর ধাপ',
      badgeEn: 'Basics',
      color: 'bg-emerald-500',
      descriptionBn: 'হিসাব খাতা অ্যাপের মূল ফিচার ও প্রাথমিক সেটিংস এক নজরে বুঝে নিন।',
      descriptionEn: 'Quick setup and essential features overview of the Hisab Khata application.',
      stepsBn: [
        {
          title: 'দোকানের নাম পরিবর্তন (Store Name)',
          detail: 'অ্যাপের উপরে আপনার নিজস্ব দোকানের নাম প্রদর্শন করা হয়। পরিবর্তন করতে "সেটিংস -> সাধারণ" এ যান এবং "দোকানের নাম" ঘরে আপনার নাম লিখে সেভ করুন।',
          tip: 'ক্লাউড সিঙ্ক চালু থাকলে নাম পরিবর্তন করলে ফায়ারবেসেও আপনার স্টোরের নাম স্বয়ংক্রিয়ভাবে আপডেট হবে।'
        },
        {
          title: 'তারিখ নির্বাচন ও সময় (Date Selector)',
          detail: 'হেডারে থাকা ক্যালেন্ডার বা ডানে/বামে তির চিহ্নে ক্লিক করে আপনি যেকোনো তারিখের বেচাকেনা ও খরচের হিসাব দেখতে পারবেন।',
          tip: 'আজকের তারিখে দ্রুত ফিরে আসতে ক্যালেন্ডারের ওপর ট্যাপ করতে পারেন।'
        },
        {
          title: 'গোপন ব্যালেন্স হাইড (Eye Icon Security)',
          detail: 'হেডার বারে ডানে থাকা "চোখ (Eye)" আইকনে ক্লিক করলে অ্যাপের সকল ব্যালেন্স ও টাকার পরিমাণ ডট ডট (••••) দিয়ে ঢেকে যাবে। কাস্টমারের সামনে হিসাব গোপন রাখতে এটি ব্যবহার করুন।'
        }
      ],
      stepsEn: [
        {
          title: 'Store Name Setup',
          detail: 'Your shop name is displayed at the top header. Change it by going to "Settings -> General" and typing your shop name in the Store Name box.',
          tip: 'When cloud sync is active, changing the shop name updates your profile in Firebase in real-time.'
        },
        {
          title: 'Date Navigation',
          detail: 'Use the calendar or left/right arrow buttons in the top header to inspect ledger records for any specific date.',
          tip: 'Clicking the calendar date resets back to today.'
        },
        {
          title: 'Hide Private Balances',
          detail: 'Tap the Eye icon on the top header to hide sensitive monetary figures behind dots (••••) when customers are nearby.'
        }
      ]
    },
    {
      id: 'sales',
      icon: ShoppingCart,
      titleBn: '২. দৈনন্দিন বিক্রয় হিসাব (Daily Sales & Transactions)',
      titleEn: '2. Daily Sales & Transactions',
      badgeBn: 'নগদ ও বাকি এন্ট্রি',
      badgeEn: 'Cash & Dues',
      color: 'bg-teal-500',
      descriptionBn: 'নগদ বিক্রি এবং কাস্টমারকে বাকিতে পণ্য বিক্রির দ্রুত এন্ট্রি দেওয়ার পদ্ধতি।',
      descriptionEn: 'How to log cash sales and due credit items efficiently in seconds.',
      stepsBn: [
        {
          title: 'নগদ বিক্রি এন্ট্রি (Cash Sales Entry)',
          detail: '১. "পণ্যের নাম" ঘরে পণ্যের নাম লিখুন (যেমন: সয়াবিন তেল ২ লিটার)।\n২. "টাকা" এর ঘরে বিক্রির মোট দাম লিখুন।\n৩. সবুজ "নগদ এন্ট্রি" বোতামে চাপ দিন। মুহূর্তের মধ্যে হিসাবটি আজকের নগদ ক্যাশে যোগ হয়ে যাবে।',
          tip: 'পণ্যের নাম না দিয়ে শুধু টাকা লিখেও দ্রুত সাধারণ নগদ এন্ট্রি দেওয়া যায়।'
        },
        {
          title: 'বাকি বিক্রি এন্ট্রি (Due Sale Entry)',
          detail: '১. "পণ্যের নাম" ও "টাকা" বসান।\n২. "ক্রেতার নাম" এর ঘরে কাস্টমারের নাম লিখুন অথবা ড্রপডাউন তালিকা থেকে বেছে নিন।\n৩. লাল "বাকি এন্ট্রি" বোতামে চাপ দিন। টাকাটি সাথে সাথে ঐ ক্রেতার বাকির খাতায় যোগ হবে।',
          tip: 'নতুন কাস্টমার হলে শুধু তার নাম লিখলেই স্বয়ংক্রিয়ভাবে নতুন অ্যাকাউন্ট তৈরি হয়ে যাবে।'
        },
        {
          title: 'স্মার্ট প্রোডাক্ট অটো-সাজেশন (Product Suggestions)',
          detail: 'পণ্যের নাম লেখা শুরু করলেই নিচে আপনার দোকানে পূর্বে বিক্রি হওয়া প্রোডাক্টগুলোর সাজেশন চলে আসবে। ট্যাপ করলেই নাম ও আগের বিক্রয়মূল্য একা একাই বসে যাবে।'
        },
        {
          title: '১/ভাগ ও একাধিক পণ্য যুক্তকরণ (Product Share Split)',
          detail: 'একত্রে একাধিক আইটেম বিক্রি করলে প্লাস চিহ্ন দিয়ে লিখুন (যেমন: "সাবান + তেল" এবং দাম "১৮০")। অ্যাপ অটোমেটিক প্রতিটি প্রোডাক্টের হিসাব ১/ভাগ করে সূক্ষ্মভাবে ট্র্যাক করবে।'
        }
      ],
      stepsEn: [
        {
          title: 'Log Cash Sale',
          detail: '1. Type product name in "Product Name" input.\n2. Enter total price in "Amount".\n3. Tap green "Cash Sale" button to log it instantly.',
          tip: 'You can omit the product name and just type the amount for quick anonymous cash sales.'
        },
        {
          title: 'Log Due Sale',
          detail: '1. Enter product and amount.\n2. Type or select the Customer Name.\n3. Tap red "Due Sale" button. It attaches directly to that customer\'s balance.',
          tip: 'Typing a new name automatically creates a new customer ledger record.'
        },
        {
          title: 'Smart Product Auto-Suggestions',
          detail: 'As you type a product name, previous item suggestions pop up with last recorded prices for 1-tap fast entry.'
        },
        {
          title: 'Product Share Split (+ Operator)',
          detail: 'Combine multiple items using "+" (e.g. "Soap + Oil", Amount "180"). The app automatically calculates fractional shares per item.'
        }
      ]
    },
    {
      id: 'dues',
      icon: Users,
      titleBn: '৩. বাকির খাতা ও কাস্টমার হিসাব (Dues & Customer Ledger)',
      titleEn: '3. Dues & Customer Ledger',
      badgeBn: 'বাকির খতিয়ান',
      badgeEn: 'Customer Ledger',
      color: 'bg-rose-500',
      descriptionBn: 'ক্রেতাদের বাকির খাতা দেখা, নতুন বাকি যোগ করা, জমা নেওয়া এবং রসিদ শেয়ার।',
      descriptionEn: 'Manage customer debts, record repayments, add new items, and share receipts.',
      stepsBn: [
        {
          title: 'কাস্টমার লেজার বা খাতা খোলা (View Ledger)',
          detail: 'বাকির তালিকার যেকোনো ক্রেতার নামের ওপর ট্যাপ করুন। ক্রেতার আজকের ও আগের সব লেনদেনের পূর্ণাঙ্গ ইতিহাস দেখতে পাবেন।',
        },
        {
          title: 'পরিশোধিত টাকা জমা নেওয়া (Add Customer Deposit)',
          detail: 'ক্রেতা পুরোনো বাকি পরিশোধ করলে কাস্টমার ডিটেইলস প্যানেলের "টাকা জমা / পেমেন্ট" ট্যাবে চাপ দিন। টাকা এবং নোট লিখে জমা দিন। ক্রেতার বাকির পরিমাণ সাথে সাথে কমে যাবে এবং ক্যাশে যোগ হবে।'
        },
        {
          title: 'নতুন বাকি দেওয়া (Add New Due Item)',
          detail: 'পুরোনো কাস্টমার আবার কোনো মালামাল বাকি নিলে কাস্টমার ডিটেইলস থেকে "পণ্য বাকি" বেছে নিয়ে প্রোডাক্টের নাম ও টাকা লিখে যোগ করতে পারেন।'
        },
        {
          title: 'ডিজিটাল রসিদ বা মেমো শেয়ার (Share Ledger Receipt)',
          detail: 'কাস্টমারের বাকির বিবরণী বা রসিদ ছবি/পিডিএফ আকারে সুন্দরভাবে তৈরি করে হোয়াটসঅ্যাপ, মেসেঞ্জার বা ইমেইলে পাঠিয়ে দিন।'
        }
      ],
      stepsEn: [
        {
          title: 'View Customer Ledger',
          detail: 'Tap any customer name in the Due List to view their complete debit/credit transaction history and total balance.'
        },
        {
          title: 'Record Debt Repayment (Deposit)',
          detail: 'When a customer pays back money, open their ledger, tap "Add Deposit", enter amount and optional note, and submit.'
        },
        {
          title: 'Add New Due Item to Customer',
          detail: 'If an existing customer takes more items on credit, select "Add Due", enter product name & price to update their total due.'
        },
        {
          title: 'Share Digital Receipt',
          detail: 'Export and send customer statement sheets as images or printable receipts directly via WhatsApp or email.'
        }
      ]
    },
    {
      id: 'expenses',
      icon: DollarSign,
      titleBn: '৪. দোকানের খরচ হিসাব (Expense Tracking)',
      titleEn: '4. Expense Tracking',
      badgeBn: 'দোকানের খরচ',
      badgeEn: 'Store Expenses',
      color: 'bg-amber-500',
      descriptionBn: 'দোকানের দৈনন্দিন আনুষঙ্গিক খরচসমূহ লিপিবদ্ধ করা ও নিট আয় নির্ধারণ।',
      descriptionEn: 'Record daily shop expenses, utility bills, and monitor net profitability.',
      stepsBn: [
        {
          title: 'নতুন খরচ যুক্ত করা (Add Expense)',
          detail: '১. হোমপেজে "খরচ" ট্যাবে যান বা লাল "খরচ যোগ" বোতামে চাপ দিন।\n২. খরচের বিবরণ (যেমন: কারেন্ট বিল, দোকান ভাড়া, নাস্তা) ও টাকা লিখে সেভ করুন।',
          tip: 'প্রতিদিনের সকল খরচ যোগ রাখলে দিন শেষে মোট বিক্রি থেকে খরচ বাদ দিয়ে প্রকৃত নিট লাভ জানা যায়।'
        },
        {
          title: 'খরচ ফিল্টারিং ও দেখা',
          detail: 'খরচের তালিকা থেকে যেকোনো খরচের বিস্তারিত তারিখ ও ক্যাটাগরি দেখা যায়।'
        }
      ],
      stepsEn: [
        {
          title: 'Record New Expense',
          detail: '1. Switch to "Expense" tab or tap "Add Expense".\n2. Enter description (e.g. Rent, Electricity, Tea) and amount, then save.'
        },
        {
          title: 'Net Sales & Profit Calculation',
          detail: 'The app automatically subtracts total daily expenses from total sales to show your exact net earnings.'
        }
      ]
    },
    {
      id: 'inventory',
      icon: PackageCheck,
      titleBn: '৫. স্টক শর্টেজ ও পাইকারি রেট (Shortage & Product Rates)',
      titleEn: '5. Shortage & Wholesale Product Rates',
      badgeBn: 'পণ্য স্টক',
      badgeEn: 'Inventory',
      color: 'bg-sky-500',
      descriptionBn: 'দোকানের শর্টেজ মালামালের লিস্ট ও কেনা দাম এবং লাভ ক্যালকুলেটর।',
      descriptionEn: 'Manage out-of-stock items list, wholesale cost rates, and calculate selling prices.',
      stepsBn: [
        {
          title: 'দোকানে যে পণ্য নেই (Out of Stock Items)',
          detail: 'যে সকল পণ্য শেষ হয়ে গেছে তা "যে পণ্য নেই" বোতামে চেপে তালিকায় তুলে রাখুন। পাইকারি বাজারে মালামাল কেনার সময় এই ডিজিটাল লিস্ট আপনাকে সহায়তা করবে।',
          tip: 'পণ্য দোকানে স্টক করা মাত্র লিস্ট থেকে এক ক্লিকে ডিলিট বা আপডেট করে দেওয়া যায়।'
        },
        {
          title: 'পাইকারি কেনা দাম রেকর্ড (Wholesale Buying Rates)',
          detail: 'প্রতিটি পণ্যের পাইকারি বা পাইকারি কেনা দাম (Cost Price) সেভ করে রাখুন যাতে বিক্রির সময় আসল কেনা দাম মনে থাকে।'
        },
        {
          title: 'লাভ ও বিক্রয় মূল্য ক্যালকুলেটর (Profit Calculator)',
          detail: 'পাইকারি রেট লিস্টের পাশে "লাভ হিসাব" বোতামে চাপ দিন। কেনা দাম থেকে আপনি কত টাকা লাভ করতে চান তা বসান (যেমন: ৫০ টাকা)। অ্যাপ সাথে সাথে আপনাকে কাস্টমারের বিক্রয় মূল্য (Selling Price = ১’শ ৫০ টাকা) এবং লাভের পার্সেন্টেজ হিসাব করে দেবে!'
        }
      ],
      stepsEn: [
        {
          title: 'Shortage / Out of Stock List',
          detail: 'Add products that run out in store so you have a quick purchasing reference when buying from wholesale suppliers.'
        },
        {
          title: 'Record Wholesale Cost Rates',
          detail: 'Store wholesale buying prices for every item for instant reference when selling to customers.'
        },
        {
          title: 'Profit & Selling Price Calculator',
          detail: 'Tap "Calc Profit" next to any product rate item, enter your target profit amount, and the app calculates total customer selling price & profit percentage automatically!'
        }
      ]
    },
    {
      id: 'calculator',
      icon: Calculator,
      titleBn: '৬. ইন-অ্যাপ ক্যালকুলেটর (In-App Calculator)',
      titleEn: '6. Built-in Smart Calculator',
      badgeBn: 'ক্যালকুলেটর',
      badgeEn: 'Calculator',
      color: 'bg-indigo-500',
      descriptionBn: 'অ্যাপের ভেতর দ্রুত গানিতিক হিসাব ও শতকরা (%) ডিসকাউন্ট হিসাব।',
      descriptionEn: 'Quick arithmetic and percentage discount calculations with 1-tap amount pasting.',
      stepsBn: [
        {
          title: 'ক্যালকুলেটর কীভাবে খুলবেন?',
          detail: 'স্ক্রিনের নিচে ডান কোণে থাকা নীল ক্যালকুলেটর ভাসমান বোতামে চাপ দিলে যেকোনো স্ক্রিনেই ক্যালকুলেটর ওপেন হয়ে যাবে।'
        },
        {
          title: 'বিক্রির ঘরে দাম বসানো (Auto-Paste Amount)',
          detail: 'ক্যালকুলেটরে বড় যোগ-বিয়োগ করার পর নিচে "দামের ঘরে বসান" বোতামে চাপ দিলে হিসেব করা ফলাফলটি সাথে সাথে বিক্রির "টাকা" এর ইনপুট বক্সে বসে যাবে!'
        }
      ],
      stepsEn: [
        {
          title: 'Open Floating Calculator',
          detail: 'Tap the blue floating calculator icon at the bottom right of the app at any time.'
        },
        {
          title: 'Paste Result to Sales Input',
          detail: 'After calculating prices on the keypad, tap "Paste to Amount" to transfer the evaluated sum into the Sale Amount box automatically.'
        }
      ]
    },
    {
      id: 'memo',
      icon: Receipt,
      titleBn: '৭. প্রফেশনাল ক্যাশ মেমো তৈরি (Cash Memo & Receipts)',
      titleEn: '7. Cash Memo Generator & Printing',
      badgeBn: 'ক্যাশ মেমো',
      badgeEn: 'Memo Receipts',
      color: 'bg-blue-600',
      descriptionBn: 'দোকানের নাম, সিল, একাধিক আইটেম ও কিউআর কোডসহ মেমো প্রিন্ট বা শেয়ার।',
      descriptionEn: 'Generate printed or PDF receipts complete with store branding, seal, items list, and QR code.',
      stepsBn: [
        {
          title: 'ক্যাশ মেমো তৈরি করা',
          detail: '১. "সেটিংস -> মেমো/রশিদ" এ যান।\n২. কাস্টমারের নাম ও একের অধিক আইটেমের নাম, পরিমাণ (Qty), একক রেট (Rate) ও ছাড় (Discount) বসান।\n৩. অ্যাপ স্বয়ংক্রিয়ভাবে মোট সাবটোটাল ও ডিসকাউন্ট হিসাব করে পূর্ণাঙ্গ ডিজিটাল মেমো তৈরি করবে।'
        },
        {
          title: 'প্রিন্ট ও ছবি বা পিডিএফ ডাউনলোড',
          detail: 'তৈরি হওয়া মেমো থার্মাল/ব্লুটুথ পোজ প্রিন্টারে প্রিন্ট করতে পারেন অথবা ছবি/পিডিএফ বানিয়ে কাস্টমারকে পাঠিয়ে দিতে পারেন।'
        },
        {
          title: 'দোকানের লোগো ও ডিজিটাল সিল',
          detail: 'প্রতিটি মেমোতে আপনার দোকানের নাম, তারিখ, মেমো নম্বর এবং প্রফেশনাল দোকানের সিল স্বয়ংক্রিয়ভাবে খোদাই হয়ে যায়।'
        }
      ],
      stepsEn: [
        {
          title: 'Create Memo / Receipt',
          detail: '1. Navigate to "Settings -> Memo/Receipt".\n2. Add customer name, items, quantity, unit rate, and discount.\n3. The app auto-calculates total payable amount and generates a stylish receipt.'
        },
        {
          title: 'Print or Download Image/PDF',
          detail: 'Print directly via Bluetooth Thermal POS printers or save as high-resolution images to share on messaging apps.'
        },
        {
          title: 'Automatic Official Seal & Branding',
          detail: 'Receipts automatically include store name, date, invoice ID, and official verified stamp.'
        }
      ]
    },
    {
      id: 'qr',
      icon: QrCode,
      titleBn: '৮. কিউআর কোড মেমো সত্যতা যাচাই (QR Code Invoice Verification)',
      titleEn: '8. QR Code Invoice Verification',
      badgeBn: 'মেমো যাচাই',
      badgeEn: 'QR Verify',
      color: 'bg-purple-600',
      descriptionBn: 'ক্যাশ মেমোর কিউআর কোড স্ক্যান করে অনলাইন থেকে অরিজিনাল মেমো যাচাই।',
      descriptionEn: 'Scan memo QR codes to verify official receipts online and prevent fraud.',
      stepsBn: [
        {
          title: 'কিউআর কোড কী এবং কীভাবে কাজ করে?',
          detail: 'আপনার তৈরি করা প্রতিটি ক্যাশ মেমোতে একটি ইউনিক নিরাপদ QR কোড থাকে। কাস্টমার স্মার্টফোনের ক্যামেরা দিয়ে উক্ত কিউআর কোড স্ক্যান করলে সরাসরি আমাদের সার্ভার থেকে ক্যাশ মেমোর অরিজিনাল ডাটা দেখতে পাবে।',
          tip: 'এটি ভুয়া বা জাল ক্যাশ মেমো তৈরি করে দোকানদারদের প্রতারিত করা সম্পূর্ণ প্রতিরোধ করে।'
        }
      ],
      stepsEn: [
        {
          title: 'How QR Verification Works',
          detail: 'Every printed memo contains a unique QR code. Scanning it with any mobile phone opens a live verification record directly from the server, confirming receipt authenticity.',
          tip: 'Prevents fake or altered invoice claims completely.'
        }
      ]
    },
    {
      id: 'cloud',
      icon: Cloud,
      titleBn: '৯. ক্লাউড ব্যাকআপ ও ফায়ারবেস সিঙ্ক (Cloud Backup & Sync)',
      titleEn: '9. Cloud Sync & Data Backup',
      badgeBn: 'ডাটা ব্যাকআপ',
      badgeEn: 'Cloud Sync',
      color: 'bg-cyan-600',
      descriptionBn: 'ফায়ারবেস ক্লাউডে ডাটা নিরাপদ রাখা, অফলাইন মোড ও ডাটা ফাইল ব্যাকআপ।',
      descriptionEn: 'Secure encrypted cloud database backup, offline capabilities, and JSON file export/import.',
      stepsBn: [
        {
          title: 'গুগল বা ইমেইল দিয়ে লগইন (Login & Sync)',
          detail: '১. "সেটিংস -> ব্যাকআপ" এ যান।\n২. গুগল বোতামে চাপ দিন বা ইমেইল/পাসওয়ার্ড দিয়ে সাইন ইন করুন।\n৩. সিঙ্ক অন করলেই আপনার সমস্ত খাতা ফায়ারবেস ক্লাউডে নিরাপদভাবে সেভ হবে।'
        },
        {
          title: 'ফোন হারিয়ে গেলে ডাটা রিকভারি',
          detail: 'ফোন হারিয়ে গেলেও চিন্তা নেই! যেকোনো নতুন ফোনে অ্যাপ নামিয়ে আগের গুগল বা ইমেইল দিয়ে লগইন করলেই ১ সেকেন্ডে আগের সমস্ত হিসাব ফিরে আসবে।'
        },
        {
          title: 'অফলাইন ওয়ার্কিং মোড (100% Offline Support)',
          detail: 'ইন্টারনেট না থাকলেও অ্যাপ স্বাভাবিকভাবে কাজ করে। পরবর্তীতে মোবাইল ডাটা/ওয়াইফাই অন হলেই অফলাইনের জমা হওয়া হিসাব স্বয়ংক্রিয়ভাবে ক্লাউডে সিঙ্ক হয়ে যাবে।'
        },
        {
          title: 'JSON ফাইল ডাউনলোড ও আপলোড (Local File Backup)',
          detail: 'ইন্টারনেট ছাড়াই ডাটা ব্যাকআপ রাখতে "ডাউনলোড খাতা" বোতামে চাপ দিয়ে .json ফাইল সেভ রাখতে পারেন। পরবর্তীতে "আপলোড খাতা" দিয়ে তা আবার রিস্টোর করতে পারবেন।'
        }
      ],
      stepsEn: [
        {
          title: 'Sign in with Google / Email',
          detail: '1. Open "Settings -> Backup".\n2. Log in with your Google account or email.\n3. Enable sync to save all ledgers to Firebase Cloud in real-time.'
        },
        {
          title: 'Instant Device Recovery',
          detail: 'If your phone gets lost or broken, simply log in on a new device with the same email account to restore all your store data instantly.'
        },
        {
          title: '100% Offline Capability',
          detail: 'Works flawlessly without internet. All offline edits automatically sync to the cloud as soon as an internet connection is re-established.'
        },
        {
          title: 'JSON Local File Backup',
          detail: 'Download complete offline ledger backups via JSON files and upload them back anytime.'
        }
      ]
    },
    {
      id: 'analytics',
      icon: BarChart3,
      titleBn: '১০. বিজনেস অ্যানালিটিক্স ও সেরা বিক্রি (Analytics & Insights)',
      titleEn: '10. Business Analytics & Peak Hours',
      badgeBn: 'বিক্রি বিশ্লেষণ',
      badgeEn: 'Analytics',
      color: 'bg-violet-600',
      descriptionBn: 'পিক আওয়ার, পিক ডে, সেরা বিক্রিত পণ্য ও পাই চার্ট রিলেটেড পরিসংখ্যান।',
      descriptionEn: 'Analyze peak sales hours, top selling products, and business growth trends.',
      stepsBn: [
        {
          title: 'মাসিক রিপোর্ট ও চার্ট বিশ্লেষণ',
          detail: '"মাসিক" ট্যাবে ক্লিক করুন। এখানে আপনার দোকানের বেচাকেনায় ক্রেতা কোন সময়ে বেশি আসে (Peak Hours) এবং সপ্তাহের কোন দিনে বেশি বিক্রি হয় (Peak Days) তা চার্টে দেখতে পাবেন।'
        },
        {
          title: 'সর্বোচ্চ ও সর্বনিম্ন বিক্রিত পণ্য (Top Sold Products)',
          detail: 'কোন পণ্যগুলো সবচেয়ে বেশি বিক্রি হচ্ছে এবং কোনগুলোর স্টক কমানো উচিত তা র‍্যাংকিং চার্টে স্পষ্ট দেখা যায়।'
        }
      ],
      stepsEn: [
        {
          title: 'Monthly Analytics & Peak Hours',
          detail: 'Visit the "Monthly" tab to discover peak customer shopping hours and top performing days of the week through interactive charts.'
        },
        {
          title: 'Top & Least Sold Products',
          detail: 'Inspect product sales frequency rankings to make smarter purchasing and stock decisions.'
        }
      ]
    },
    {
      id: 'settings',
      icon: Moon,
      titleBn: '১১. থিম, মোড ও পেছনের হিসাব অডিট (Themes & History Audit)',
      titleEn: '11. Themes, Dark Mode & History Audit',
      badgeBn: 'অন্যান্য সেটিংস',
      badgeEn: 'Preferences',
      color: 'bg-slate-700',
      descriptionBn: 'ডার্ক মোড, লাইট মোড, অটো থিম এবং পেছনের তারিখের ভুল হিসাব সংশোধন।',
      descriptionEn: 'Toggle dark mode, system auto theme, and audit past transaction entries.',
      stepsBn: [
        {
          title: 'ডার্ক ও লাইট মোড (Dark/Light Theme)',
          detail: '"সেটিংস -> সাধারণ" এ গিয়ে ডার্ক মোড, লাইট মোড বা আপনার ফোনের অপারেটিং সিস্টেমের সাথে অটো সিঙ্ক মোড সিলেক্ট করতে পারেন।'
        },
        {
          title: 'পুরোনো তারিখের ইতিহাস ও অডিট (Past Ledger Audit)',
          detail: '"সেটিংস -> ইতিহাস" ট্যাবে গিয়ে পেছনের যেকোনো তারিখ বেছে নিয়ে ঐ দিনের বিক্রি সংশোধন, কাস্টমার বাকি ডিলিট বা পুরো দিনের রেকর্ড পুনর্নিরীক্ষণ করতে পারেন।'
        }
      ],
      stepsEn: [
        {
          title: 'Dark / Light Theme Selection',
          detail: 'Choose between Light mode, dark mode, or System Auto mode under "Settings -> General".'
        },
        {
          title: 'Audit & Edit Past Records',
          detail: 'Go to "Settings -> History", pick any past calendar date to audit, edit, or clean up transaction entries.'
        }
      ]
    }
  ];

  // Filter sections by search query or active category
  const filteredSections = guideSections.filter(section => {
    const title = isBangla ? section.titleBn : section.titleEn;
    const desc = isBangla ? section.descriptionBn : section.descriptionEn;
    const steps = isBangla ? section.stepsBn : section.stepsEn;
    
    const matchesSearch = 
      !searchQuery.trim() ||
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      steps.some(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.detail.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = 
      activeCategory === 'all' || section.id === activeCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'all', labelBn: 'সব বিষয়', labelEn: 'All Topics', icon: BookOpen },
    { id: 'sales', labelBn: 'বিক্রি', labelEn: 'Sales', icon: ShoppingCart },
    { id: 'dues', labelBn: 'বাকির খাতা', labelEn: 'Dues', icon: Users },
    { id: 'expenses', labelBn: 'খরচ', labelEn: 'Expenses', icon: DollarSign },
    { id: 'inventory', labelBn: 'স্টক ও কেনা দাম', labelEn: 'Rates', icon: PackageCheck },
    { id: 'memo', labelBn: 'ক্যাশ মেমো', labelEn: 'Memo', icon: Receipt },
    { id: 'cloud', labelBn: 'ক্লাউড সিঙ্ক', labelEn: 'Cloud', icon: Cloud },
    { id: 'analytics', labelBn: 'রিপোর্ট', labelEn: 'Analytics', icon: BarChart3 }
  ];

  const content = (
    <div className={`w-full ${isModalMode ? 'p-4 sm:p-6' : 'p-0'} space-y-5 text-slate-800 dark:text-slate-100`}>
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-teal-700 via-teal-800 to-indigo-900 dark:from-slate-900 dark:via-teal-950 dark:to-indigo-950 p-5 sm:p-6 rounded-3xl text-white shadow-xl relative overflow-hidden border border-teal-600/30">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-black tracking-wide text-teal-100 border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
              <span>{isBangla ? 'সম্পূর্ণ ব্যবহার নির্দেশিকা' : 'Complete User Manual'}</span>
            </span>
            {isModalMode && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-teal-300" />
              <span>{isBangla ? 'হিসাব খাতা ব্যবহার টিউটোরিয়াল' : 'Hisab Khata App Manual'}</span>
            </h2>
            <p className="text-xs sm:text-sm text-teal-100/90 font-medium max-w-2xl leading-relaxed">
              {isBangla
                ? 'আপনার দোকানের হিসাব খাতা অ্যাপের প্রতিটি ফিচার কীভাবে কাজ করে এবং কীভাবে দ্রুত ও সঠিকভাবে বেচাকেনা পরিচালনা করবেন তার বিস্তারিত নির্দেশনা।'
                : 'Learn how every function of your Hisab Khata store app works step-by-step to streamline your ledger and business.'}
            </p>
          </div>

          {/* Quick Stats / Micro Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/15">
            <span className="text-[10.5px] font-bold text-teal-100 bg-white/10 px-2.5 py-1 rounded-lg flex items-center gap-1">
              ✅ {isBangla ? '১০০% সহজ ও দ্রুত' : '100% Easy & Fast'}
            </span>
            <span className="text-[10.5px] font-bold text-teal-100 bg-white/10 px-2.5 py-1 rounded-lg flex items-center gap-1">
              📱 {isBangla ? 'সম্পূর্ণ মোবাইল ফ্রেন্ডলি' : 'Fully Mobile Friendly'}
            </span>
            <span className="text-[10.5px] font-bold text-teal-100 bg-white/10 px-2.5 py-1 rounded-lg flex items-center gap-1">
              ☁️ {isBangla ? 'নিরাপদ ক্লাউড সেভ' : 'Secure Cloud Backup'}
            </span>
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="space-y-3">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-600 dark:text-teal-400 pointer-events-none" />
          <input
            type="text"
            placeholder={isBangla ? 'যেকোনো ফিচার বা টিউটোরিয়াল খুঁজুন (যেমন: মেমো, বাকি, সিঙ্ক, ক্যালকুলেটর)...' : 'Search any topic (e.g., memo, dues, sync, calculator)...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 text-xs sm:text-sm bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 font-medium shadow-3xs transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  if (cat.id !== 'all') {
                    setOpenAccordion(cat.id);
                  }
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-3xs scale-105'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-teal-600 dark:text-teal-400'}`} />
                <span>{isBangla ? cat.labelBn : cat.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Guide Content Accordion List */}
      <div className="space-y-3.5">
        {filteredSections.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
            <Info className="h-8 w-8 text-slate-400 mx-auto animate-bounce" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {isBangla ? 'কোনো বিষয় বা নির্দেশনা খুঁজে পাওয়া যায়নি।' : 'No manual instructions match your search query.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
              className="text-xs text-teal-600 font-extrabold hover:underline"
            >
              {isBangla ? 'সব বিষয় আবার দেখুন' : 'Reset Search Filters'}
            </button>
          </div>
        ) : (
          filteredSections.map((section) => {
            const Icon = section.icon;
            const isOpen = openAccordion === section.id || searchQuery.trim().length > 0;
            const steps = isBangla ? section.stepsBn : section.stepsEn;

            return (
              <div
                key={section.id}
                className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-3xs overflow-hidden transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600"
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => setOpenAccordion(isOpen && searchQuery.trim().length === 0 ? null : section.id)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2.5 rounded-xl text-white ${section.color} shadow-3xs shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                          {isBangla ? section.titleBn : section.titleEn}
                        </h3>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-100 dark:border-teal-900">
                          {isBangla ? section.badgeBn : section.badgeEn}
                        </span>
                      </div>
                      <p className="text-[10.5px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                        {isBangla ? section.descriptionBn : section.descriptionEn}
                      </p>
                    </div>
                  </div>

                  <div className="p-1 rounded-lg text-slate-400 dark:text-slate-500 shrink-0">
                    {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </div>
                </button>

                {/* Accordion Expanded Body */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 p-4 sm:p-5 space-y-3.5"
                    >
                      {steps.map((step, idx) => (
                        <div
                          key={idx}
                          className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-150 dark:border-slate-700/60 shadow-3xs space-y-1.5"
                        >
                          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-xs">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span className="font-black text-slate-900 dark:text-slate-100">{step.title}</span>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-line pl-6">
                            {step.detail}
                          </p>

                          {step.tip && (
                            <div className="ml-6 mt-2 p-2.5 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/50 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 font-semibold flex items-start gap-2">
                              <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                              <p className="leading-snug">
                                <span className="font-extrabold mr-1">{isBangla ? 'পরামর্শ:' : 'Pro Tip:'}</span>
                                {step.tip}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Helpful Support Footer */}
      <div className="p-4 bg-gradient-to-r from-teal-50 via-indigo-50 to-purple-50 dark:from-slate-800 dark:via-teal-950/40 dark:to-indigo-950/40 rounded-2xl border border-teal-100 dark:border-slate-700 text-center space-y-2">
        <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-teal-600" />
          <span>{isBangla ? 'কোনো সমস্যা বা সাহায্যের জন্য' : 'Need Further Technical Support?'}</span>
        </h4>
        <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
          {isBangla
            ? 'অ্যাপ সম্পর্কিত যেকোনো তথ্য বা সহযোগিতার জন্য ডেভেলপার জনি দত্ত (Jonydatta) এর সাথে ফেসবুকে যোগাযোগ করুন।'
            : 'For any technical assistance or custom updates, feel free to reach out to founder & developer Jony Datta.'}
        </p>
        <a
          href="https://www.facebook.com/jonydatta247"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-black transition-all shadow-3xs cursor-pointer active:scale-95"
        >
          <span>{isBangla ? 'ফেসবুকে যোগাযোগ করুন' : 'Connect on Facebook'}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );

  if (isModalMode) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black"
        />

        {/* Modal Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-3xl bg-slate-50 dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col z-10"
        >
          <div className="overflow-y-auto flex-1 p-2 sm:p-4 scrollbar-thin">
            {content}
          </div>
        </motion.div>
      </div>
    );
  }

  return content;
}
