import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Printer, 
  Download, 
  Plus, 
  Trash2, 
  User, 
  Phone, 
  FileText, 
  Calendar, 
  Store, 
  MapPin, 
  Hash, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { Transaction, ProductRateItem } from '../types';
import { toBanglaNumber, formatDate, formatCurrency, generateId } from '../utils';

interface MemoTabProps {
  transactions: Transaction[];
  productRates: ProductRateItem[];
  shopName: string;
  isBangla: boolean;
}

interface MemoItem {
  id: string;
  name: string;
  quantity: number;
  rate: number;
  total: number;
  unit: string;
}

export default function MemoTab({ transactions, productRates, shopName, isBangla }: MemoTabProps) {
  // --- Shop Settings ---
  const [memoShopName, setMemoShopName] = useState(shopName || localStorage.getItem('hisab_khata_shop_name') || 'আমার দোকান');
  const [shopAddress, setShopAddress] = useState(localStorage.getItem('memo_shop_address') || 'ঢাকা, বাংলাদেশ');
  const [shopPhone, setShopPhone] = useState(localStorage.getItem('memo_shop_phone') || '01XXXXXXXXX');

  // Save shop details locally when they change
  useEffect(() => {
    localStorage.setItem('memo_shop_address', shopAddress);
  }, [shopAddress]);

  useEffect(() => {
    localStorage.setItem('memo_shop_phone', shopPhone);
  }, [shopPhone]);

  // Synchronize with parent shopName if it changes
  useEffect(() => {
    if (shopName) {
      setMemoShopName(shopName);
    }
  }, [shopName]);

  // --- Billing Settings ---
  const [invoiceNo, setInvoiceNo] = useState('');
  const [memoDate, setMemoDate] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Initializing default invoice and date
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setMemoDate(`${yyyy}-${mm}-${dd}`);
    
    // Random beautiful invoice serial
    const randSerial = Math.floor(100000 + Math.random() * 900000);
    setInvoiceNo(`INV-${randSerial}`);
  }, []);

  // --- Memo Size & Units State ---
  const [memoSize, setMemoSize] = useState<'a4' | 'a5' | 'pos'>('a4');
  const unitsList = isBangla 
    ? ['পিছ', 'কেজি', 'গ্রাম', 'লিটার', 'গজ', 'ফুট', 'ব্যাগ', 'প্যাকেট', 'ডজন', 'টি', 'বস্তা', 'লিঃ']
    : ['pcs', 'kg', 'g', 'L', 'yd', 'ft', 'bag', 'pkt', 'doz', 'pcs', 'sack', 'Ltr'];
  const [newItemUnit, setNewItemUnit] = useState(isBangla ? 'পিছ' : 'pcs');

  // --- Memo Items State ---
  const [items, setItems] = useState<MemoItem[]>([]);
  
  // New Item Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemRate, setNewItemRate] = useState('');

  // Autocomplete Suggestions State
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Calculations
  const [discount, setDiscount] = useState('0');
  const [paid, setPaid] = useState('0');
  const [memoNote, setMemoNote] = useState(isBangla ? 'বিক্রিত মাল ফেরত নেওয়া হয় না।' : 'Sold goods are not returnable.');
  const [showBuyerSign, setShowBuyerSign] = useState(true);
  const [showSellerSign, setShowSellerSign] = useState(true);

  // Success toast
  const [successMsg, setSuccessMsg] = useState('');

  const triggerToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Extract unique customer names from transaction history for smart suggestions
  const customerSuggestions = React.useMemo(() => {
    const names = new Set<string>();
    transactions.forEach(tx => {
      if (tx.customer && tx.customer.trim()) {
        names.add(tx.customer.trim());
      }
    });
    return Array.from(names);
  }, [transactions]);

  // Filter products based on search
  const filteredProducts = React.useMemo(() => {
    if (!newItemName) return productRates;
    return productRates.filter(p => 
      p.name.toLowerCase().includes(newItemName.toLowerCase())
    );
  }, [productRates, newItemName]);

  // Filter customers based on search
  const filteredCustomers = React.useMemo(() => {
    if (!customerName) return customerSuggestions;
    return customerSuggestions.filter(c => 
      c.toLowerCase().includes(customerName.toLowerCase())
    );
  }, [customerSuggestions, customerName]);

  // Handle Product selection from autocomplete
  const handleSelectProductSuggestion = (prod: ProductRateItem) => {
    setNewItemName(prod.name);
    setNewItemRate(String(prod.buyingPrice)); // Use defined rate
    setShowProductSuggestions(false);
  };

  // Handle Customer selection from autocomplete
  const handleSelectCustomerSuggestion = (name: string) => {
    setCustomerName(name);
    setShowCustomerSuggestions(false);
  };

  // Add Item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      triggerToast(isBangla ? 'দয়া করে পণ্যের নাম দিন!' : 'Please enter product name!');
      return;
    }
    const qty = parseFloat(newItemQty) || 1;
    const rate = parseFloat(newItemRate) || 0;
    
    const newItem: MemoItem = {
      id: generateId(),
      name: newItemName.trim(),
      quantity: qty,
      rate: rate,
      total: qty * rate,
      unit: newItemUnit
    };

    setItems([...items, newItem]);
    
    // Reset item form
    setNewItemName('');
    setNewItemQty('1');
    setNewItemRate('');
    
    triggerToast(isBangla ? 'পণ্য মেমোতে যোগ করা হয়েছে!' : 'Product added to memo!');
  };

  // Delete Item
  const handleDeleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    triggerToast(isBangla ? 'পণ্যটি ডিলিট করা হয়েছে!' : 'Product removed!');
  };

  // Calculations
  const subTotal = items.reduce((sum, item) => sum + item.total, 0);
  const discountVal = parseFloat(discount) || 0;
  const netTotal = Math.max(0, subTotal - discountVal);
  const paidVal = parseFloat(paid) || 0;
  const dueVal = Math.max(0, netTotal - paidVal);

  // Auto set paid amount to net total if it's not custom edited
  const handleSetFullPaid = () => {
    setPaid(String(netTotal));
    triggerToast(isBangla ? 'পূর্ণ পরিশোধ সেট করা হয়েছে!' : 'Marked as fully paid!');
  };

  // --- DYNAMIC CANVAS RENDERING ENGINE (Supports A4, A5, and Thermal POS) ---
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawMemoOnCanvas = (canvas: HTMLCanvasElement, sizeType: 'a4' | 'a5' | 'pos') => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Determine dimensions based on selected receipt size
    let width = 800;
    let height = 1130;
    if (sizeType === 'a5') {
      width = 600;
      height = 850;
    } else if (sizeType === 'pos') {
      width = 420;
      // Thermal slips scale dynamically to avoid wasting paper!
      height = 420 + Math.max(3, items.length) * 35 + 220;
    }

    const scale = 2;
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.scale(scale, scale);

    // Background color (Light Cream Memo Paper Vibe)
    ctx.fillStyle = '#FCFBF7';
    ctx.fillRect(0, 0, width, height);

    // Outer decorative borders
    const borderMargin = sizeType === 'pos' ? 8 : 15;
    const innerBorderMargin = sizeType === 'pos' ? 11 : 20;
    
    ctx.strokeStyle = '#0F766E'; // Teal theme
    ctx.lineWidth = sizeType === 'pos' ? 2 : 4;
    ctx.strokeRect(borderMargin, borderMargin, width - borderMargin * 2, height - borderMargin * 2);

    ctx.strokeStyle = '#0F766E';
    ctx.lineWidth = 1;
    ctx.strokeRect(innerBorderMargin, innerBorderMargin, width - innerBorderMargin * 2, height - innerBorderMargin * 2);

    // Header Content
    ctx.fillStyle = '#0F766E';
    ctx.textAlign = 'center';
    
    // Business Name
    ctx.font = sizeType === 'pos' ? 'bold 22px sans-serif' : 'bold 32px sans-serif';
    ctx.fillText(memoShopName, width / 2, sizeType === 'pos' ? 50 : 80);

    // Address & Subtitle
    ctx.fillStyle = '#475569';
    ctx.font = sizeType === 'pos' ? 'bold 11px sans-serif' : 'bold 16px sans-serif';
    ctx.fillText(isBangla ? 'ক্যাশ মেমো / রশিদ' : 'CASH MEMO / RECEIPT', width / 2, sizeType === 'pos' ? 74 : 112);
    
    ctx.font = sizeType === 'pos' ? '10px sans-serif' : '14px sans-serif';
    ctx.fillText(`${isBangla ? 'ঠিকানা: ' : 'Address: '}${shopAddress}`, width / 2, sizeType === 'pos' ? 95 : 138);
    ctx.fillText(`${isBangla ? 'মোবাইল: ' : 'Mobile: '}${shopPhone}`, width / 2, sizeType === 'pos' ? 114 : 160);

    // Horizontal Separator Line
    const sepY = sizeType === 'pos' ? 132 : 185;
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(innerBorderMargin + 10, sepY);
    ctx.lineTo(width - innerBorderMargin - 10, sepY);
    ctx.stroke();

    // Billing details (Invoice, Customer info)
    const marginX = sizeType === 'pos' ? 20 : 35;
    const detailY = sizeType === 'pos' ? 155 : 215;
    const spacingY = sizeType === 'pos' ? 18 : 27;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#1E293B';
    ctx.font = sizeType === 'pos' ? 'bold 10px sans-serif' : 'bold 14px sans-serif';
    ctx.fillText(`${isBangla ? 'রশিদ নং: ' : 'Invoice No: '} ${isBangla ? toBanglaNumber(invoiceNo) : invoiceNo}`, marginX + 10, detailY);
    
    const formattedCust = customerName || (isBangla ? 'সাধারণ ক্রেতা' : 'General Customer');
    ctx.fillText(`${isBangla ? 'ক্রেতার নাম: ' : 'Customer: '} ${formattedCust}`, marginX + 10, detailY + spacingY);
    
    if (customerPhone) {
      ctx.fillText(`${isBangla ? 'মোবাইল: ' : 'Mobile: '} ${isBangla ? toBanglaNumber(customerPhone) : customerPhone}`, marginX + 10, detailY + spacingY * 2);
    }

    // Date (Aligned to Right side)
    ctx.textAlign = 'right';
    const formattedDate = memoDate ? formatDate(memoDate, isBangla) : '';
    ctx.fillText(`${isBangla ? 'তারিখ: ' : 'Date: '} ${formattedDate}`, width - marginX - 10, detailY);

    // Draw Items Table
    const startY = sizeType === 'pos' ? (customerPhone ? 220 : 202) : 300;
    const tableHeight = sizeType === 'pos' ? Math.max(3, items.length) * 32 + 35 : (sizeType === 'a5' ? 320 : 420);
    const tableWidth = width - (marginX * 2);

    const colSl = marginX;
    const colDesc = sizeType === 'pos' ? marginX + 30 : marginX + 65;
    const colQty = sizeType === 'pos' ? width - 170 : width - 370;
    const colRate = sizeType === 'pos' ? width - 105 : width - 280;
    const colTotal = sizeType === 'pos' ? width - 50 : width - 170;

    // Table Header Background
    ctx.fillStyle = '#0F766E';
    ctx.fillRect(marginX, startY, tableWidth, 35);

    // Table Header Labels
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.font = sizeType === 'pos' ? 'bold 10px sans-serif' : 'bold 13px sans-serif';
    ctx.fillText(isBangla ? 'ক্র.' : 'Sl', (colSl + colDesc) / 2, startY + 22);
    ctx.textAlign = 'left';
    ctx.fillText(isBangla ? 'পণ্যের বিবরণ' : 'Description', colDesc + 8, startY + 22);
    ctx.textAlign = 'center';
    ctx.fillText(isBangla ? 'পরিমাণ' : 'Qty', (colQty + colRate) / 2, startY + 22);
    ctx.fillText(isBangla ? 'দর' : 'Rate', (colRate + colTotal) / 2, startY + 22);
    ctx.textAlign = 'right';
    ctx.fillText(isBangla ? 'মোট টাকা' : 'Total (৳)', width - marginX - 15, startY + 22);

    // Draw main table container box
    ctx.strokeStyle = '#0F766E';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(marginX, startY, tableWidth, tableHeight);

    // Draw vertical column grid lines
    ctx.beginPath();
    ctx.moveTo(colDesc, startY); ctx.lineTo(colDesc, startY + tableHeight);
    ctx.moveTo(colQty, startY); ctx.lineTo(colQty, startY + tableHeight);
    ctx.moveTo(colRate, startY); ctx.lineTo(colRate, startY + tableHeight);
    ctx.moveTo(colTotal, startY); ctx.lineTo(colTotal, startY + tableHeight);
    ctx.stroke();

    // Fill table records
    ctx.fillStyle = '#1E293B';
    ctx.font = sizeType === 'pos' ? '10px sans-serif' : '13px sans-serif';
    
    const rowHeight = sizeType === 'pos' ? 32 : 32;
    const maxRows = Math.floor((tableHeight - 35) / rowHeight);

    for (let i = 0; i < maxRows; i++) {
      const item = items[i];
      const currentY = startY + 35 + (i * rowHeight);
      
      // Draw horizontal line dividers
      if (i < maxRows - 1) {
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(marginX, currentY + rowHeight);
        ctx.lineTo(width - marginX, currentY + rowHeight);
        ctx.stroke();
      }

      if (item) {
        // Serial
        ctx.textAlign = 'center';
        ctx.fillText(isBangla ? toBanglaNumber(i + 1) : String(i + 1), (colSl + colDesc) / 2, currentY + 20);

        // Name
        ctx.textAlign = 'left';
        let nameToDraw = item.name;
        const limit = sizeType === 'pos' ? 20 : (sizeType === 'a5' ? 28 : 36);
        if (nameToDraw.length > limit) {
          nameToDraw = nameToDraw.substring(0, limit - 2) + '...';
        }
        ctx.fillText(nameToDraw, colDesc + 8, currentY + 20);

        // Quantity (Rendered with selected Unit!)
        ctx.textAlign = 'center';
        const qtyStr = (isBangla ? toBanglaNumber(item.quantity) : String(item.quantity)) + ' ' + (item.unit || '');
        ctx.fillText(qtyStr, (colQty + colRate) / 2, currentY + 20);

        // Rate
        ctx.fillText(isBangla ? toBanglaNumber(item.rate) : String(item.rate), (colRate + colTotal) / 2, currentY + 20);

        // Total sum
        ctx.textAlign = 'right';
        ctx.fillText(isBangla ? toBanglaNumber(item.total) : String(item.total), width - marginX - 15, currentY + 20);
      }
    }

    // Calculations Summary Box (bottom right)
    const summaryStartY = startY + tableHeight + 20;
    ctx.textAlign = 'right';
    ctx.font = sizeType === 'pos' ? '10px sans-serif' : '14px sans-serif';
    ctx.fillStyle = '#475569';

    const calcSpacing = sizeType === 'pos' ? 18 : 25;

    // Subtotal
    ctx.fillText(`${isBangla ? 'মোট টাকা: ' : 'Subtotal: '} ৳ ${isBangla ? toBanglaNumber(subTotal) : subTotal}`, width - marginX - 15, summaryStartY);
    
    // Discount
    ctx.fillText(`${isBangla ? 'ডিসকাউন্ট: ' : 'Discount: '} - ৳ ${isBangla ? toBanglaNumber(discountVal) : discountVal}`, width - marginX - 15, summaryStartY + calcSpacing);
    
    // Net Payable
    ctx.font = sizeType === 'pos' ? 'bold 11px sans-serif' : 'bold 15px sans-serif';
    ctx.fillStyle = '#0F766E';
    ctx.fillText(`${isBangla ? 'সর্বমোট টাকা: ' : 'Net Payable: '} ৳ ${isBangla ? toBanglaNumber(netTotal) : netTotal}`, width - marginX - 15, summaryStartY + calcSpacing * 2);

    // Paid & Due
    ctx.font = sizeType === 'pos' ? '10px sans-serif' : '14px sans-serif';
    ctx.fillStyle = '#1E293B';
    ctx.fillText(`${isBangla ? 'পরিশোধ: ' : 'Paid Amount: '} ৳ ${isBangla ? toBanglaNumber(paidVal) : paidVal}`, width - marginX - 15, summaryStartY + calcSpacing * 3);
    
    ctx.font = sizeType === 'pos' ? 'bold 10px sans-serif' : 'bold 14px sans-serif';
    ctx.fillStyle = dueVal > 0 ? '#B91C1C' : '#047857';
    ctx.fillText(`${isBangla ? 'বাকি (বকেয়া): ' : 'Due Balance: '} ৳ ${isBangla ? toBanglaNumber(dueVal) : dueVal}`, width - marginX - 15, summaryStartY + calcSpacing * 4);

    // Custom Note (bottom left)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748B';
    ctx.font = sizeType === 'pos' ? 'italic 9px sans-serif' : 'italic 12px sans-serif';
    ctx.fillText(`${isBangla ? 'মন্তব্য: ' : 'Notes: '}${memoNote}`, marginX + 10, summaryStartY + 12);

    // Footer lines & signatures section
    const sigY = summaryStartY + calcSpacing * 5 + (sizeType === 'pos' ? 30 : 60);
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1;
    ctx.font = sizeType === 'pos' ? '9px sans-serif' : '12px sans-serif';
    ctx.fillStyle = '#475569';

    const sigLineWidth = sizeType === 'pos' ? 90 : 155;

    // Customer Signature Line
    if (showBuyerSign) {
      ctx.beginPath();
      ctx.moveTo(marginX + 10, sigY);
      ctx.lineTo(marginX + 10 + sigLineWidth, sigY);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(isBangla ? 'ক্রেতার স্বাক্ষর' : 'Customer Signature', marginX + 10 + sigLineWidth / 2, sigY + 15);
    }

    // Seller Signature Line
    if (showSellerSign) {
      ctx.beginPath();
      ctx.moveTo(width - marginX - 10 - sigLineWidth, sigY);
      ctx.lineTo(width - marginX - 10, sigY);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(isBangla ? 'বিক্রেতার স্বাক্ষর' : 'Seller Signature', width - marginX - 10 - sigLineWidth / 2, sigY + 15);
    }

    // Brand Credit
    ctx.fillStyle = '#94A3B8';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isBangla ? 'ডিজিটাল হিসাব খাতা দ্বারা সংকলিত' : 'Generated via Digital Hisab Khata', width / 2, height - (sizeType === 'pos' ? 15 : 30));
  };

  const downloadJPG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawMemoOnCanvas(canvas, memoSize);

    // Trigger local download link
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.download = `${invoiceNo || 'Memo'}_receipt_${memoSize.toUpperCase()}.jpg`;
    link.href = dataUrl;
    link.click();
    triggerToast(isBangla ? 'রশিদ সফলভাবে ডাউনলোড করা হয়েছে!' : 'Receipt successfully downloaded as JPG!');
  };

  const downloadPDF = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Draw on high resolution canvas first
    drawMemoOnCanvas(canvas, memoSize);
    const dataUrl = canvas.toDataURL('image/jpeg', 1.0);

    const { jsPDF } = await import('jspdf');
    
    let format: string | [number, number] = 'a4';
    if (memoSize === 'a4') {
      format = 'a4';
    } else if (memoSize === 'a5') {
      format = 'a5';
    } else if (memoSize === 'pos') {
      // Scale standard 80mm roll based on canvas aspect ratio
      const rollWidth = 80;
      const aspect = canvas.height / canvas.width;
      format = [rollWidth, rollWidth * aspect];
    }

    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: format
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Append standard canvas image onto the PDF document
    pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${invoiceNo || 'Memo'}_receipt_${memoSize.toUpperCase()}.pdf`);
    triggerToast(isBangla ? 'রশিদ সফলভাবে PDF ডাউনলোড করা হয়েছে!' : 'Receipt successfully downloaded as PDF!');
  };

  // --- PRINT VIA HIDDEN IFRAME ---
  const printMemo = () => {
    // Generate styled print contents
    const formattedCust = customerName || (isBangla ? 'সাধারণ ক্রেতা' : 'General Customer');
    const formattedDate = memoDate ? formatDate(memoDate, isBangla) : '';

    // Adjust sizes dynamically for print layouts
    let maxContainerWidth = '800px';
    let minContainerHeight = '1000px';
    let pagePadding = '30px';
    let borderStyle = '2px solid #0f766e';
    let shopTitleFontSize = '32px';
    let bodyFontSize = '13px';
    let totalContainerWidth = '300px';
    let emptyRowsCount = Math.max(0, 10 - items.length);

    if (memoSize === 'a5') {
      maxContainerWidth = '580px';
      minContainerHeight = '720px';
      pagePadding = '20px';
      borderStyle = '2px solid #0f766e';
      shopTitleFontSize = '26px';
      bodyFontSize = '12px';
      totalContainerWidth = '240px';
      emptyRowsCount = Math.max(0, 5 - items.length);
    } else if (memoSize === 'pos') {
      maxContainerWidth = '80mm';
      minContainerHeight = 'auto';
      pagePadding = '12px';
      borderStyle = '1px dashed #0f766e';
      shopTitleFontSize = '20px';
      bodyFontSize = '10px';
      totalContainerWidth = '100%';
      emptyRowsCount = 0; // No trailing empty padding lines on continuous roll slips
    }

    const htmlContent = `
      <html>
        <head>
          <title>Cash Memo - ${invoiceNo}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            body {
              font-family: 'Inter', 'Bangla', sans-serif;
              color: #1e293b;
              margin: 0;
              padding: ${memoSize === 'pos' ? '0' : '20px'};
              background-color: #fff;
            }
            .memo-container {
              max-width: ${maxContainerWidth};
              margin: 0 auto;
              border: ${borderStyle};
              padding: ${pagePadding};
              box-sizing: border-box;
              background: #fff;
              position: relative;
              min-height: ${minContainerHeight};
            }
            .shop-header {
              text-align: center;
              margin-bottom: 25px;
            }
            .shop-title {
              font-size: ${shopTitleFontSize};
              font-weight: 700;
              color: #0f766e;
              margin: 0 0 5px 0;
            }
            .memo-label {
              font-size: ${memoSize === 'pos' ? '12px' : '16px'};
              font-weight: 700;
              color: #475569;
              letter-spacing: 1px;
              margin: 0 0 10px 0;
            }
            .shop-meta {
              font-size: ${memoSize === 'pos' ? '10px' : '14px'};
              color: #475569;
              margin: 2px 0;
            }
            .divider {
              border-top: 2px solid #cbd5e1;
              margin: 20px 0;
            }
            .billing-info {
              display: flex;
              justify-content: space-between;
              font-size: ${bodyFontSize};
              line-height: 1.6;
              margin-bottom: 30px;
            }
            .billing-left {
              text-align: left;
            }
            .billing-right {
              text-align: right;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th {
              background-color: #0f766e;
              color: #ffffff;
              font-weight: 600;
              text-align: left;
              padding: ${memoSize === 'pos' ? '6px 4px' : '10px'};
              font-size: ${bodyFontSize};
            }
            th.center { text-align: center; }
            th.right { text-align: right; }
            td {
              padding: ${memoSize === 'pos' ? '8px 4px' : '12px 10px'};
              border-bottom: 1px solid #e2e8f0;
              font-size: ${bodyFontSize};
            }
            td.center { text-align: center; }
            td.right { text-align: right; }
            .totals-container {
              float: right;
              width: ${totalContainerWidth};
              margin-top: 10px;
              font-size: ${bodyFontSize};
              line-height: 2;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              border-bottom: 1px solid #f1f5f9;
            }
            .totals-row.bold {
              font-weight: 700;
              color: #0f766e;
              font-size: ${memoSize === 'pos' ? '12px' : '16px'};
              border-bottom: 2px solid #0f766e;
            }
            .totals-row.due {
              color: ${dueVal > 0 ? '#b91c1c' : '#047857'};
              font-weight: 700;
            }
            .notes-container {
              float: left;
              width: ${memoSize === 'pos' ? '100%' : '400px'};
              margin-top: 15px;
              font-size: ${memoSize === 'pos' ? '9px' : '12px'};
              color: #64748b;
              font-style: italic;
            }
            .signature-section {
              margin-top: ${memoSize === 'pos' ? '100px' : '180px'};
              display: flex;
              justify-content: space-between;
              clear: both;
            }
            .signature-line {
              border-top: 1px solid #94a3b8;
              width: ${memoSize === 'pos' ? '90px' : '180px'};
              text-align: center;
              padding-top: 5px;
              font-size: ${memoSize === 'pos' ? '9px' : '12px'};
              color: #475569;
            }
            .footer-credit {
              position: absolute;
              bottom: 15px;
              left: 0;
              right: 0;
              text-align: center;
              font-size: 10px;
              color: #94a3b8;
            }
            @page {
              size: ${memoSize === 'a4' ? 'A4 portrait' : memoSize === 'a5' ? 'A5 portrait' : '80mm auto'};
              margin: ${memoSize === 'pos' ? '0' : '15mm 10mm'};
            }
            @media print {
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background-color: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .memo-container {
                border: ${borderStyle} !important;
                box-shadow: none !important;
                margin: 0 auto !important;
                background-color: #ffffff !important;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="memo-container">
            <div class="shop-header">
              <div class="shop-title">${memoShopName}</div>
              <div class="memo-label">${isBangla ? 'ক্যাশ মেমো / রশিদ' : 'CASH MEMO / RECEIPT'}</div>
              <div class="shop-meta">${isBangla ? 'ঠিকানা: ' : 'Address: '}${shopAddress}</div>
              <div class="shop-meta">${isBangla ? 'মোবাইল: ' : 'Mobile: '}${shopPhone}</div>
            </div>

            <div class="divider"></div>

            <div class="billing-info">
              <div class="billing-left">
                <div><strong>${isBangla ? 'রশিদ নং: ' : 'Invoice No:'}</strong> ${isBangla ? toBanglaNumber(invoiceNo) : invoiceNo}</div>
                <div><strong>${isBangla ? 'ক্রেতার নাম: ' : 'Customer:'}</strong> ${formattedCust}</div>
                ${customerPhone ? `<div><strong>${isBangla ? 'মোবাইল: ' : 'Mobile:'}</strong> ${isBangla ? toBanglaNumber(customerPhone) : customerPhone}</div>` : ''}
              </div>
              <div class="billing-right">
                <div><strong>${isBangla ? 'তারিখ: ' : 'Date:'}</strong> ${formattedDate}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 8%; text-align: center;">${isBangla ? 'ক্র. নং' : 'Sl'}</th>
                  <th style="width: 52%;">${isBangla ? 'পণ্যের বিবরণ' : 'Product Description'}</th>
                  <th style="width: 15%; text-align: center;">${isBangla ? 'পরিমাণ' : 'Qty'}</th>
                  <th style="width: 12%; text-align: center;">${isBangla ? 'দর' : 'Rate'}</th>
                  <th style="width: 13%; text-align: right;">${isBangla ? 'মোট টাকা' : 'Total'}</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((item, index) => `
                  <tr>
                    <td class="center">${isBangla ? toBanglaNumber(index + 1) : index + 1}</td>
                    <td>${item.name}</td>
                    <td class="center">${isBangla ? toBanglaNumber(item.quantity) : item.quantity} ${item.unit || ''}</td>
                    <td class="center">${isBangla ? toBanglaNumber(item.rate) : item.rate}</td>
                    <td class="right">${isBangla ? toBanglaNumber(item.total) : item.total}</td>
                  </tr>
                `).join('')}
                ${Array.from({ length: emptyRowsCount }).map(() => `
                  <tr style="height: 32px;">
                    <td class="center"></td>
                    <td></td>
                    <td class="center"></td>
                    <td class="center"></td>
                    <td class="right"></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="notes-container">
              <strong>${isBangla ? 'মন্তব্য: ' : 'Notes:'}</strong> ${memoNote}
            </div>

            <div class="totals-container">
              <div class="totals-row">
                <span>${isBangla ? 'মোট টাকা:' : 'Subtotal:'}</span>
                <span>৳ ${isBangla ? toBanglaNumber(subTotal) : subTotal}</span>
              </div>
              <div class="totals-row">
                <span>${isBangla ? 'ডিসকাউন্ট:' : 'Discount:'}</span>
                <span>- ৳ ${isBangla ? toBanglaNumber(discountVal) : discountVal}</span>
              </div>
              <div class="totals-row bold">
                <span>${isBangla ? 'সর্বমোট টাকা:' : 'Net Payable:'}</span>
                <span>৳ ${isBangla ? toBanglaNumber(netTotal) : netTotal}</span>
              </div>
              <div class="totals-row">
                <span>${isBangla ? 'পরিশোধ:' : 'Paid Amount:'}</span>
                <span>৳ ${isBangla ? toBanglaNumber(paidVal) : paidVal}</span>
              </div>
              <div class="totals-row due">
                <span>${isBangla ? 'বাকি (বকেয়া):' : 'Due Balance:'}</span>
                <span>৳ ${isBangla ? toBanglaNumber(dueVal) : dueVal}</span>
              </div>
            </div>

            <div class="signature-section" style="${memoSize === 'pos' ? 'margin-top: 50px;' : ''}">
              ${showBuyerSign ? `<div class="signature-line">${isBangla ? 'ক্রেতার স্বাক্ষর' : 'Customer Signature'}</div>` : '<div></div>'}
              ${showSellerSign ? `<div class="signature-line">${isBangla ? 'বিক্রেতার স্বাক্ষর' : 'Seller Signature'}</div>` : '<div></div>'}
            </div>

            <div class="footer-credit" style="${memoSize === 'pos' ? 'position: relative; margin-top: 30px; bottom: 0;' : ''}">
              ${isBangla ? 'ডিজিটাল হিসাব খাতা দ্বারা সংকলিত' : 'Generated via Digital Hisab Khata'}
            </div>
          </div>
        </body>
      </html>
    `;

    // Create a hidden iframe to host print window
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            // Clean up iframe after printing
            setTimeout(() => {
              document.body.removeChild(iframe);
            }, 1000);
          } catch (printErr) {
            console.error("Iframe printing failed or was blocked by sandbox:", printErr);
            document.body.removeChild(iframe);
            
            // Fallback: Open in a new tab for printing which is super safe
            const win = window.open('', '_blank');
            if (win) {
              win.document.open();
              win.document.write(htmlContent);
              win.document.close();
              win.focus();
              setTimeout(() => {
                win.print();
                win.close();
              }, 500);
            } else {
              triggerToast(isBangla ? 'পপ-আপ ব্লক করা হয়েছে! দয়া করে পপ-আপ অনুমোদন করুন বা নতুন ট্যাবে অ্যাপটি খুলুন।' : 'Popup blocked! Please allow popups or open the app in a new tab.');
            }
          }
        }, 500);
      }
    } catch (err) {
      console.error("General printing process failed:", err);
      // Absolute fallback: Open in a new tab
      const win = window.open('', '_blank');
      if (win) {
        win.document.open();
        win.document.write(htmlContent);
        win.document.close();
        win.focus();
        setTimeout(() => {
          win.print();
          win.close();
        }, 500);
      } else {
        triggerToast(isBangla ? 'রশিদ প্রিন্ট করতে নতুন ট্যাবে অ্যাপটি খুলুন।' : 'Please open the app in a new tab to print receipt.');
      }
    }
  };

  return (
    <motion.div
      key="memo-settings"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
      id="memo-component-container"
    >
      {/* Toast Alert */}
      {successMsg && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 bg-teal-800 text-white font-extrabold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-teal-600 animate-bounce">
          <Check className="h-5 w-5 bg-white text-teal-800 rounded-full p-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid: Form on left/top, Live receipt preview on right/bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Memo Form Column */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Shop and Invoice basic settings block */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Store className="h-4 w-4 text-teal-600" />
              {isBangla ? 'দোকান ও রশিদের তথ্য' : 'Shop & Invoice Config'}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">{isBangla ? 'দোকানের নাম' : 'Shop Name'}</label>
                <div className="relative">
                  <input
                    type="text"
                    value={memoShopName}
                    onChange={(e) => setMemoShopName(e.target.value)}
                    className="w-full text-xs font-extrabold text-slate-800 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl py-2.5 pl-9 pr-3 outline-none"
                    placeholder={isBangla ? 'দোকানের নাম' : 'Shop Name'}
                  />
                  <Store className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">{isBangla ? 'মোবাইল নম্বর' : 'Phone No'}</label>
                <div className="relative">
                  <input
                    type="text"
                    value={shopPhone}
                    onChange={(e) => setShopPhone(e.target.value)}
                    className="w-full text-xs font-extrabold text-slate-800 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl py-2.5 pl-9 pr-3 outline-none"
                    placeholder={isBangla ? 'দোকানের মোবাইল নং' : 'Shop Phone'}
                  />
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-500">{isBangla ? 'দোকানের ঠিকানা' : 'Address'}</label>
                <div className="relative">
                  <input
                    type="text"
                    value={shopAddress}
                    onChange={(e) => setShopAddress(e.target.value)}
                    className="w-full text-xs font-extrabold text-slate-800 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl py-2.5 pl-9 pr-3 outline-none"
                    placeholder={isBangla ? 'যেমন: গুলশান, ঢাকা' : 'e.g. Gulshan, Dhaka'}
                  />
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">{isBangla ? 'রশিদ নম্বর (INV)' : 'Invoice No'}</label>
                <div className="relative">
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full text-xs font-extrabold text-slate-800 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl py-2.5 pl-9 pr-3 outline-none"
                  />
                  <Hash className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">{isBangla ? 'তারিখ' : 'Date'}</label>
                <div className="relative">
                  <input
                    type="date"
                    value={memoDate}
                    onChange={(e) => setMemoDate(e.target.value)}
                    className="w-full text-xs font-extrabold text-slate-800 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl py-2.5 pl-9 pr-3 outline-none"
                  />
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Memo size configuration buttons */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-500">{isBangla ? 'রশিদের সাইজ বা পেপার সাইজ' : 'Receipt Paper Size'}</label>
                <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setMemoSize('a4');
                      triggerToast(isBangla ? 'রশিদের সাইজ A4 সেট করা হয়েছে!' : 'Paper size set to A4!');
                    }}
                    className={`py-1.5 text-xs font-extrabold rounded-lg cursor-pointer transition-all text-center ${
                      memoSize === 'a4'
                        ? 'bg-white text-teal-700 shadow-3xs'
                        : 'text-slate-500 hover:text-slate-800 font-bold'
                    }`}
                  >
                    A4 ({isBangla ? 'বড়' : 'Large'})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMemoSize('a5');
                      triggerToast(isBangla ? 'রশিদের সাইজ A5 সেট করা হয়েছে!' : 'Paper size set to A5!');
                    }}
                    className={`py-1.5 text-xs font-extrabold rounded-lg cursor-pointer transition-all text-center ${
                      memoSize === 'a5'
                        ? 'bg-white text-teal-700 shadow-3xs'
                        : 'text-slate-500 hover:text-slate-800 font-bold'
                    }`}
                  >
                    A5 ({isBangla ? 'মাঝারি' : 'Medium'})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMemoSize('pos');
                      triggerToast(isBangla ? 'থার্মাল POS রিসিট সাইজ সেট করা হয়েছে!' : 'Paper size set to Thermal POS!');
                    }}
                    className={`py-1.5 text-xs font-extrabold rounded-lg cursor-pointer transition-all text-center ${
                      memoSize === 'pos'
                        ? 'bg-white text-teal-700 shadow-3xs'
                        : 'text-slate-500 hover:text-slate-800 font-bold'
                    }`}
                  >
                    POS ({isBangla ? 'থার্মাল' : 'Thermal'})
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Customer configurations block */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="h-4 w-4 text-teal-600" />
              {isBangla ? 'ক্রেতার বিবরণ' : 'Customer Details'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 relative">
              {/* Customer Name Autocomplete */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-slate-500">{isBangla ? 'ক্রেতার নাম' : 'Customer Name'}</label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setShowCustomerSuggestions(true);
                    }}
                    onFocus={() => setShowCustomerSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
                    className="w-full text-xs font-extrabold text-slate-800 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl py-2.5 pl-9 pr-3 outline-none"
                    placeholder={isBangla ? 'ক্রেতার নাম লিখুন' : 'Enter Customer Name'}
                  />
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                </div>

                {/* Suggestions overlay */}
                {showCustomerSuggestions && filteredCustomers.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-slate-200 mt-1 rounded-xl shadow-lg max-h-40 overflow-y-auto divide-y divide-slate-50">
                    {filteredCustomers.map((cust, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={() => handleSelectCustomerSuggestion(cust)}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        {cust}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">{isBangla ? 'ক্রেতার মোবাইল নম্বর' : 'Customer Phone'}</label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full text-xs font-extrabold text-slate-800 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl py-2.5 pl-9 pr-3 outline-none"
                    placeholder={isBangla ? 'ক্রেতার মোবাইল নম্বর' : 'Customer Mobile'}
                  />
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Add Item form and items list table */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <FileText className="h-4 w-4 text-teal-600" />
              {isBangla ? 'পণ্যের তালিকা যোগ করুন' : 'Add Products to List'}
            </h3>

            {/* Form to add item */}
            <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end relative">
              {/* Product name field with suggestion */}
              <div className="sm:col-span-4 space-y-1.5 relative">
                <label className="text-xs font-bold text-slate-500">{isBangla ? 'পণ্যের বিবরণ' : 'Product'}</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => {
                    setNewItemName(e.target.value);
                    setShowProductSuggestions(true);
                  }}
                  onFocus={() => setShowProductSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowProductSuggestions(false), 200)}
                  className="w-full text-xs font-extrabold text-slate-800 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl py-2.5 px-3 outline-none"
                  placeholder={isBangla ? 'পণ্যের নাম লিখুন' : 'Search Product'}
                />

                {/* Suggestions Overlay */}
                {showProductSuggestions && filteredProducts.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-slate-200 mt-1 rounded-xl shadow-lg max-h-40 overflow-y-auto divide-y divide-slate-50">
                    {filteredProducts.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={() => handleSelectProductSuggestion(p)}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex justify-between"
                      >
                        <span>{p.name}</span>
                        <span className="text-teal-600 font-extrabold">৳{p.buyingPrice}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-500">{isBangla ? 'পরিমাণ' : 'Qty'}</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                  className="w-full text-xs font-extrabold text-slate-800 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl py-2.5 px-3 outline-none text-center"
                />
              </div>

              {/* Product Unit Selector */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-500">{isBangla ? 'একক (ইউনিট)' : 'Unit'}</label>
                <select
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                  className="w-full text-xs font-black text-slate-800 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl py-2.5 px-2 outline-none cursor-pointer"
                >
                  {unitsList.map((unit) => (
                    <option key={unit} value={unit} className="font-extrabold">
                      {unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-500">{isBangla ? 'দর (টাকা)' : 'Rate'}</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={newItemRate}
                  onChange={(e) => setNewItemRate(e.target.value)}
                  className="w-full text-xs font-extrabold text-slate-800 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl py-2.5 px-3 outline-none text-right"
                  placeholder="0.00"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl transition-all shadow-3xs cursor-pointer flex items-center justify-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  {isBangla ? 'যোগ' : 'Add'}
                </button>
              </div>
            </form>

            {/* List of currently added items */}
            {items.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden mt-4">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold">
                      <tr>
                        <th className="px-3 py-2.5 text-center w-10">#</th>
                        <th className="px-3 py-2.5">{isBangla ? 'পণ্যের নাম' : 'Product'}</th>
                        <th className="px-3 py-2.5 text-center">{isBangla ? 'পরিমাণ' : 'Qty'}</th>
                        <th className="px-3 py-2.5 text-right">{isBangla ? 'দর' : 'Rate'}</th>
                        <th className="px-3 py-2.5 text-right">{isBangla ? 'মোট' : 'Total'}</th>
                        <th className="px-3 py-2.5 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold">
                      {items.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2.5 text-center font-bold text-slate-400">
                            {isBangla ? toBanglaNumber(index + 1) : index + 1}
                          </td>
                          <td className="px-3 py-2.5 text-slate-900 truncate max-w-xs">{item.name}</td>
                          <td className="px-3 py-2.5 text-center">
                            {isBangla ? toBanglaNumber(item.quantity) : item.quantity}{' '}
                            <span className="text-[10px] bg-slate-100 text-slate-500 font-extrabold px-1.5 py-0.5 rounded">
                              {item.unit}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right">৳{isBangla ? toBanglaNumber(item.rate) : item.rate}</td>
                          <td className="px-3 py-2.5 text-right text-teal-700 font-black">৳{isBangla ? toBanglaNumber(item.total) : item.total}</td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-rose-600 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <AlertCircle className="h-8 w-8 text-slate-300 mb-2" />
                <span className="text-xs font-extrabold">{isBangla ? 'রশিদে কোনো পণ্য যোগ করা হয়নি।' : 'No products added to the list.'}</span>
              </div>
            )}
          </div>

          {/* Discount, Paid, Due config panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Hash className="h-4 w-4 text-teal-600" />
              {isBangla ? 'ডিসকাউন্ট ও পেমেন্ট হিসাব' : 'Discounts & Payment Config'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">{isBangla ? 'ডিসকাউন্ট (টাকা)' : 'Discount (৳)'}</label>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full text-xs font-extrabold text-slate-800 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl py-2.5 px-3 outline-none text-right"
                  placeholder="0"
                />
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-slate-500">{isBangla ? 'পরিশোধিত টাকা' : 'Paid Amount (৳)'}</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={paid}
                    onChange={(e) => setPaid(e.target.value)}
                    className="w-full text-xs font-extrabold text-slate-800 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl py-2.5 pl-3 pr-12 outline-none text-right"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={handleSetFullPaid}
                    className="absolute right-1.5 top-1.5 bg-slate-100 hover:bg-teal-50 text-slate-500 hover:text-teal-700 text-[10px] font-black px-1.5 py-1 rounded-md transition-all cursor-pointer border border-slate-200"
                  >
                    {isBangla ? 'সব' : 'All'}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">{isBangla ? 'বাকি বা বকেয়া (স্বয়ংক্রিয়)' : 'Due (Auto)'}</label>
                <div className="w-full text-xs font-black text-rose-700 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-right">
                  {formatCurrency(dueVal, isBangla)}
                </div>
              </div>

              <div className="sm:col-span-3 space-y-1.5">
                <label className="text-xs font-bold text-slate-500">{isBangla ? 'নিচের মন্তব্য/শর্তাবলী' : 'Footer Note'}</label>
                <input
                  type="text"
                  value={memoNote}
                  onChange={(e) => setMemoNote(e.target.value)}
                  className="w-full text-xs font-extrabold text-slate-800 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl py-2.5 px-3 outline-none"
                  placeholder={isBangla ? 'মন্তব্য...' : 'e.g. Sold items can not be returned'}
                />
              </div>
            </div>

            {/* Checkboxes for signature visual toggling */}
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={showBuyerSign}
                  onChange={(e) => setShowBuyerSign(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4 border-slate-300"
                />
                {isBangla ? 'ক্রেতার স্বাক্ষর লাইন দেখান' : 'Show Customer Sign line'}
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={showSellerSign}
                  onChange={(e) => setShowSellerSign(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4 border-slate-300"
                />
                {isBangla ? 'বিক্রেতার স্বাক্ষর লাইন দেখান' : 'Show Seller Sign line'}
              </label>
            </div>
          </div>

        </div>

        {/* Right Side: Cash Memo Visual Paper Preview Column */}
        <div className="lg:col-span-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-sm font-black text-slate-900">{isBangla ? 'লাইভ মেমো প্রিভিউ' : 'Live Receipt Preview'}</h3>
            <span className="text-[10px] bg-teal-50 border border-teal-100 text-teal-700 font-extrabold px-2 py-0.5 rounded-full">
              {memoSize.toUpperCase()} {isBangla ? 'সাইজ প্রিভিউ' : 'Size Preview'}
            </span>
          </div>

          {/* Elegant Cash Memo Sheet Container */}
          <div 
            className="w-full bg-[#FDFDFB] border border-teal-700 p-5 rounded-2xl shadow-md font-sans text-slate-800 relative mx-auto select-none flex flex-col justify-between transition-all duration-300"
            style={(() => {
              switch (memoSize) {
                case 'a5':
                  return { minHeight: '520px', maxWidth: '370px', boxShadow: '0 4px 20px -2px rgba(15, 118, 110, 0.08)' };
                case 'pos':
                  return { minHeight: '440px', maxWidth: '300px', boxShadow: '0 4px 20px -2px rgba(15, 118, 110, 0.08)', borderStyle: 'dashed' };
                case 'a4':
                default:
                  return { minHeight: '640px', maxWidth: '440px', boxShadow: '0 4px 20px -2px rgba(15, 118, 110, 0.08)' };
              }
            })()}
            id="printable-cash-memo-sheet"
          >
            {/* Header decor lines */}
            <div className="absolute top-2.5 left-2.5 right-2.5 bottom-2.5 border border-teal-800/20 pointer-events-none rounded-lg" />
            <div className="absolute top-3 left-3 right-3 bottom-3 border border-teal-800/60 pointer-events-none rounded-lg" />

            <div>
              {/* Header */}
              <div className="text-center mt-2 mb-4">
                <h1 className="text-xl sm:text-2xl font-black text-teal-800 tracking-tight leading-none mb-1.5">{memoShopName}</h1>
                <p className="text-[11px] font-black text-slate-500 tracking-wider mb-1.5 uppercase">{isBangla ? 'ক্যাশ মেমো / রশিদ' : 'CASH MEMO / RECEIPT'}</p>
                <div className="text-[10px] text-slate-500 space-y-0.5">
                  <p>{isBangla ? 'ঠিকানা: ' : 'Address: '}{shopAddress}</p>
                  <p>{isBangla ? 'মোবাইল: ' : 'Phone: '}{shopPhone}</p>
                </div>
              </div>

              <div className="border-t border-slate-300 my-2.5" />

              {/* Bill Meta */}
              <div className="text-[10px] space-y-1 font-bold text-slate-600 flex justify-between items-start">
                <div className="space-y-0.5">
                  <p><span className="font-extrabold text-slate-500">{isBangla ? 'রশিদ নং: ' : 'INV:'}</span> {isBangla ? toBanglaNumber(invoiceNo) : invoiceNo}</p>
                  <p>
                    <span className="font-extrabold text-slate-500">{isBangla ? 'ক্রেতা: ' : 'Cust:'}</span>{' '}
                    <span className="text-slate-800 font-black">{customerName || (isBangla ? 'সাধারণ ক্রেতা' : 'General Customer')}</span>
                  </p>
                  {customerPhone && (
                    <p><span className="font-extrabold text-slate-500">{isBangla ? 'মোবাইল: ' : 'Mobile:'}</span> {isBangla ? toBanglaNumber(customerPhone) : customerPhone}</p>
                  )}
                </div>
                <div className="text-right">
                  <p><span className="font-extrabold text-slate-500">{isBangla ? 'তারিখ: ' : 'Date:'}</span> {memoDate ? formatDate(memoDate, isBangla) : ''}</p>
                </div>
              </div>

              {/* Items Table in Cash Memo Preview */}
              <div className="mt-4 border border-teal-700/80 rounded-lg overflow-hidden">
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-teal-700/10 text-teal-800 font-extrabold border-b border-teal-700/80">
                      <th className="px-2 py-1.5 text-center border-r border-teal-700/40 w-8">{isBangla ? 'ক্র.' : 'Sl'}</th>
                      <th className="px-2 py-1.5 border-r border-teal-700/40">{isBangla ? 'বিবরণ' : 'Description'}</th>
                      <th className="px-1 py-1.5 text-center border-r border-teal-700/40 w-10">{isBangla ? 'পরিমাণ' : 'Qty'}</th>
                      <th className="px-1.5 py-1.5 text-center border-r border-teal-700/40 w-10">{isBangla ? 'দর' : 'Rate'}</th>
                      <th className="px-2 py-1.5 text-right w-16">{isBangla ? 'মোট' : 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length > 0 ? (
                      items.map((item, idx) => (
                        <tr key={item.id} className="border-b border-slate-200 font-bold hover:bg-slate-50/40">
                          <td className="px-2 py-1 text-center border-r border-slate-200/60 text-slate-400">
                            {isBangla ? toBanglaNumber(idx + 1) : idx + 1}
                          </td>
                          <td className="px-2 py-1 text-slate-800 truncate max-w-[120px]">{item.name}</td>
                          <td className="px-1 py-1 text-center border-r border-slate-200/60">
                            {isBangla ? toBanglaNumber(item.quantity) : item.quantity}{' '}
                            <span className="text-[8px] text-slate-400 font-bold">{item.unit || ''}</span>
                          </td>
                          <td className="px-1.5 py-1 text-center border-r border-slate-200/60">{isBangla ? toBanglaNumber(item.rate) : item.rate}</td>
                          <td className="px-2 py-1 text-right text-teal-800 font-black">৳{isBangla ? toBanglaNumber(item.total) : item.total}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-3 py-10 text-center text-slate-400 font-extrabold italic">
                          {isBangla ? 'কোনো পণ্য যোগ করা হয়নি।' : 'No products added.'}
                        </td>
                      </tr>
                    )}
                    
                    {/* Empty placeholder rows to give cash memo feel */}
                    {memoSize !== 'pos' && items.length < 5 && Array.from({ length: 5 - items.length }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-100 h-6">
                        <td className="border-r border-slate-100"></td>
                        <td className="border-r border-slate-100"></td>
                        <td className="border-r border-slate-100"></td>
                        <td className="border-r border-slate-100"></td>
                        <td></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom calculations rows */}
              <div className="mt-3.5 flex justify-between items-start text-[10px]">
                <div className="w-1/2 pr-3">
                  <div className="text-slate-500 leading-relaxed font-bold">
                    <p className="font-extrabold text-slate-600 mb-0.5">{isBangla ? 'মন্তব্য:' : 'Note:'}</p>
                    <p className="italic text-slate-400">{memoNote}</p>
                  </div>
                </div>
                
                <div className="w-1/2 space-y-1 font-bold text-slate-600">
                  <div className="flex justify-between border-b border-slate-100 pb-0.5">
                    <span>{isBangla ? 'মোট টাকা:' : 'Subtotal:'}</span>
                    <span className="text-slate-800">৳{isBangla ? toBanglaNumber(subTotal) : subTotal}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-0.5 text-slate-500">
                    <span>{isBangla ? 'ডিসকাউন্ট:' : 'Discount:'}</span>
                    <span>- ৳{isBangla ? toBanglaNumber(discountVal) : discountVal}</span>
                  </div>
                  <div className="flex justify-between border-b border-teal-700/40 pb-0.5 font-extrabold text-teal-800 text-[11px]">
                    <span>{isBangla ? 'সর্বমোট টাকা:' : 'Net payable:'}</span>
                    <span>৳{isBangla ? toBanglaNumber(netTotal) : netTotal}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-0.5 text-slate-500">
                    <span>{isBangla ? 'পরিশোধ:' : 'Paid:'}</span>
                    <span className="text-slate-800">৳{isBangla ? toBanglaNumber(paidVal) : paidVal}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-[11px]" style={{ color: dueVal > 0 ? '#b91c1c' : '#047857' }}>
                    <span>{isBangla ? 'বাকি বা বকেয়া:' : 'Due balance:'}</span>
                    <span>৳{isBangla ? toBanglaNumber(dueVal) : dueVal}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Buyer and Seller Signatures */}
            <div className="mt-14 mb-2 flex justify-between text-[9px] font-bold text-slate-500">
              {showBuyerSign ? (
                <div className="text-center w-24">
                  <div className="border-t border-slate-300 pt-1">{isBangla ? 'ক্রেতার স্বাক্ষর' : 'Customer Sign'}</div>
                </div>
              ) : <div />}
              
              {showSellerSign ? (
                <div className="text-center w-24">
                  <div className="border-t border-slate-300 pt-1">{isBangla ? 'বিক্রেতার স্বাক্ষর' : 'Seller Sign'}</div>
                </div>
              ) : <div />}
            </div>

            {/* Bottom credit info */}
            <div className="text-center text-[7px] text-slate-300 pt-2 border-t border-slate-100/50 mt-1">
              {isBangla ? 'ডিজিটাল হিসাব খাতা ক্যাশ মেমো সিস্টেম' : 'Digital Hisab Khata Cash Memo system'}
            </div>
          </div>

          {/* Action buttons to trigger print and download */}
          <div className="grid grid-cols-3 gap-2.5 max-w-[440px] mx-auto">
            <button
              type="button"
              onClick={printMemo}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black text-[11px] py-3 px-1 rounded-xl transition-all shadow-3xs cursor-pointer flex items-center justify-center gap-1.5 border border-slate-700"
            >
              <Printer className="h-3.5 w-3.5 text-teal-400" />
              {isBangla ? 'প্রিন্ট / PDF' : 'Print / PDF'}
            </button>

            <button
              type="button"
              onClick={downloadPDF}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black text-[11px] py-3 px-1 rounded-xl transition-all shadow-3xs cursor-pointer flex items-center justify-center gap-1.5 border border-emerald-600"
            >
              <Download className="h-3.5 w-3.5 text-teal-200" />
              {isBangla ? 'ডাউনলোড PDF' : 'Download PDF'}
            </button>

            <button
              type="button"
              onClick={downloadJPG}
              className="w-full bg-teal-700 hover:bg-teal-800 text-white font-black text-[11px] py-3 px-1 rounded-xl transition-all shadow-3xs cursor-pointer flex items-center justify-center gap-1.5 border border-teal-600"
            >
              <Download className="h-3.5 w-3.5" />
              {isBangla ? 'ডাউনলোড JPG' : 'Download JPG'}
            </button>
          </div>

        </div>

      </div>

      {/* Hidden Canvas used strictly for high-resolution JPG generation in background */}
      <canvas ref={canvasRef} className="hidden" />

    </motion.div>
  );
}
