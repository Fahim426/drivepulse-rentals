import PDFDocument from 'pdfkit';
import {
  Booking,
  Customer,
  Vehicle,
  User,
  BookingExtra,
  CustomerDocument,
  Payment,
  Invoice,
} from '@prisma/client';

export type BookingWithDetails = Booking & {
  customer: Customer & { documents: CustomerDocument[] };
  vehicle: Vehicle;
  createdByUser: User;
  extras: BookingExtra[];
};

export type PaymentWithDetails = Payment & {
  booking: Booking & {
    customer: Customer;
    vehicle: Vehicle;
  };
  receivedByUser: User;
};

export type InvoiceWithDetails = Invoice & {
  booking: Booking & {
    customer: Customer;
    vehicle: Vehicle;
    extras: BookingExtra[];
  };
};

export class PdfService {
  /**
   * Generates a rental agreement PDF as a readable stream / buffer
   */
  public static async generateRentalAgreement(booking: BookingWithDetails): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Rental Agreement - ${booking.bookingNumber}`,
          Author: 'DrivePulse Rental Management',
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);

      const dlDoc = booking.customer.documents.find((d) => d.docType === 'DRIVING_LICENCE');
      const formatCurrency = (amt: number) => `INR ${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

      // ================= Header =================
      doc.rect(40, 40, 515, 60).fill('#0f172a'); // Dark slate header
      doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text('DRIVEPULSE CAR RENTALS', 55, 52);
      doc.fontSize(8).font('Helvetica').fillColor('#94a3b8').text('Self-Drive & Chauffeur Fleet Operations | GSTIN: 29AABCU9603R1ZM', 55, 74);
      doc.text('Outer Ring Road, Bengaluru, Karnataka 560103 | +91 98765 43210 | support@drivepulse.com', 55, 86);

      // Title & Booking Reference Box
      doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('MOTOR VEHICLE RENTAL AGREEMENT', 40, 115);
      
      doc.roundedRect(360, 108, 195, 30, 4).lineWidth(1).stroke('#e2e8f0');
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('BOOKING NO:', 370, 113);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0284c7').text(booking.bookingNumber, 445, 112);
      doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(`Status: ${booking.status}`, 370, 126);
      doc.text(`Date: ${formatDate(booking.createdAt)}`, 445, 126);

      // ================= 2-Column: Customer & Vehicle =================
      const topY = 145;

      // Left Column: Customer (Hirer)
      doc.roundedRect(40, topY, 250, 130, 4).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('HIRER (CUSTOMER) DETAILS', 50, topY + 10);
      doc.fontSize(8.5).font('Helvetica').fillColor('#334155');
      doc.text(`Name: ${booking.customer.fullName}`, 50, topY + 28);
      doc.text(`Phone: ${booking.customer.phone}`, 50, topY + 42);
      doc.text(`Email: ${booking.customer.email || 'N/A'}`, 50, topY + 56);
      doc.text(`Address: ${booking.customer.address.substring(0, 45)}...`, 50, topY + 70);
      doc.font('Helvetica-Bold').fillColor('#0369a1');
      doc.text(
        `DL No: ${dlDoc ? dlDoc.documentNumber : 'Verified at counter'}`,
        50,
        topY + 86
      );
      doc.font('Helvetica').fillColor('#475569');
      doc.text(
        `DL Expiry: ${dlDoc && dlDoc.expiryDate ? new Date(dlDoc.expiryDate).toLocaleDateString('en-IN') : 'N/A'}`,
        50,
        topY + 100
      );
      doc.text(`Emergency: ${booking.customer.emergencyContactName || 'N/A'} (${booking.customer.emergencyContactPhone || 'N/A'})`, 50, topY + 114);

      // Right Column: Vehicle & Trip
      doc.roundedRect(305, topY, 250, 130, 4).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('VEHICLE & RENTAL PERIOD', 315, topY + 10);
      doc.fontSize(8.5).font('Helvetica').fillColor('#334155');
      doc.text(`Vehicle: ${booking.vehicle.make} ${booking.vehicle.model} (${booking.vehicle.year})`, 315, topY + 28);
      doc.font('Helvetica-Bold').fillColor('#0284c7');
      doc.text(`Reg Number: ${booking.vehicle.registrationNumber}`, 315, topY + 42);
      doc.font('Helvetica').fillColor('#334155');
      doc.text(`Fuel / Trans: ${booking.vehicle.fuelType} / ${booking.vehicle.transmission}`, 315, topY + 56);
      doc.text(`Pickup: ${formatDate(booking.pickupDateTime)}`, 315, topY + 70);
      doc.text(`Return: ${formatDate(booking.returnDateTime)}`, 315, topY + 84);
      doc.text(`Pickup Location: ${booking.pickupLocation}`, 315, topY + 98);
      doc.text(`Return Location: ${booking.returnLocation}`, 315, topY + 112);

      // ================= Pricing Breakdown Table =================
      const tableY = 285;
      doc.rect(40, tableY, 515, 20).fill('#e2e8f0');
      doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold');
      doc.text('Description / Charges Item', 50, tableY + 6);
      doc.text('Qty / Duration', 300, tableY + 6);
      doc.text('Rate', 400, tableY + 6);
      doc.text('Total (INR)', 470, tableY + 6);

      let currentY = tableY + 24;
      const addRow = (desc: string, qty: string, rate: string, total: string, isBold = false) => {
        doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(isBold ? '#0f172a' : '#334155');
        doc.text(desc, 50, currentY);
        doc.text(qty, 300, currentY);
        doc.text(rate, 400, currentY);
        doc.text(total, 470, currentY);
        currentY += 16;
      };

      addRow(
        `Base Rental (${booking.vehicle.make} ${booking.vehicle.model})`,
        `${booking.rentalDays} Day(s)`,
        `INR ${booking.baseRate}/d`,
        formatCurrency(booking.baseRate * booking.rentalDays)
      );

      if (booking.withDriver) {
        addRow(
          'Chauffeur / Driver Allowance',
          `${booking.rentalDays} Day(s)`,
          `INR ${booking.driverAllowancePerDay}/d`,
          formatCurrency(booking.driverAllowancePerDay * booking.rentalDays)
        );
      }

      booking.extras.forEach((extra) => {
        const rateStr = extra.dailyPrice > 0 ? `INR ${extra.dailyPrice}/d` : `INR ${extra.fixedPrice}`;
        addRow(`Add-on: ${extra.name}`, `Qty: ${extra.quantity}`, rateStr, formatCurrency(extra.totalAmount));
      });

      if (booking.discountAmount > 0) {
        addRow('Promotional / Manager Discount', '-', '-', `- ${formatCurrency(booking.discountAmount)}`);
      }

      // Divider line
      doc.moveTo(40, currentY + 2).lineTo(555, currentY + 2).lineWidth(1).stroke('#cbd5e1');
      currentY += 8;

      const subtotal = booking.totalAmount - booking.taxAmount;
      addRow('Subtotal (Exclusive of Taxes)', '', '', formatCurrency(subtotal), true);
      addRow(`GST Tax (${booking.taxPercentage}%)`, '', '', formatCurrency(booking.taxAmount));
      
      // Total Highlight Box
      doc.rect(40, currentY + 2, 515, 24).fill('#f1f5f9');
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold');
      doc.text('GRAND TOTAL RENTAL CHARGES', 50, currentY + 8);
      doc.text(formatCurrency(booking.totalAmount), 460, currentY + 8);
      currentY += 32;

      // Security Deposit & Balance summary
      doc.roundedRect(40, currentY, 515, 34, 4).fillAndStroke('#eff6ff', '#bfdbfe');
      doc.fillColor('#1e40af').fontSize(8.5).font('Helvetica-Bold');
      doc.text(`Refundable Security Deposit: ${formatCurrency(booking.securityDeposit)}`, 50, currentY + 7);
      doc.text(`Advance Paid: ${formatCurrency(booking.advancePaid)}`, 240, currentY + 7);
      doc.text(`Balance Due at Pickup: ${formatCurrency(booking.balanceDue)}`, 380, currentY + 7);
      doc.font('Helvetica').fontSize(7.5).fillColor('#3b82f6').text(
        '* Security deposit is held separately and refunded within 48h of return inspection subject to deductions for damages/traffic fines.',
        50,
        currentY + 20
      );
      currentY += 44;

      // ================= Terms & Conditions =================
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('KEY RENTAL TERMS & CONDITIONS', 40, currentY);
      currentY += 14;

      const terms = [
        '1. Authorized Driving: Only the registered hirer possessing a valid Driving Licence is permitted to operate the vehicle. Lending or sub-renting is strictly prohibited.',
        '2. Speed Limit: The maximum speed limit is 100 km/h on expressways and 80 km/h on highways. Speed violations incur a statutory fine of INR 1,000 per violation.',
        '3. Fuel Policy: Vehicle must be returned with the same fuel level as dispatched at pickup. Fuel shortages are billed at prevailing fuel cost plus a 15% service charge.',
        `4. Kilometre Allowance: Daily limit is ${booking.vehicle.kmLimitPerDay} km/day. Additional travel beyond total allowed kilometres is charged at INR ${booking.vehicle.extraKmCharge}/km.`,
        '5. Damage & Accidents: Hirer must report any accident or incident immediately to DrivePulse within 2 hours with an official police GD entry if applicable.',
        '6. Prohibited Activities: Commercial passenger carriage, off-roading, carrying contraband or intoxicating substances is strictly barred.',
      ];

      doc.font('Helvetica').fontSize(7).fillColor('#475569');
      terms.forEach((term) => {
        doc.text(term, 40, currentY, { width: 515, align: 'justify' });
        currentY += 11;
      });

      // ================= Signature Section =================
      const signY = 680;
      doc.rect(40, signY, 240, 70).lineWidth(0.5).stroke('#cbd5e1');
      doc.rect(315, signY, 240, 70).lineWidth(0.5).stroke('#cbd5e1');

      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold');
      doc.text('AUTHORIZED COMPANY SIGNATORY', 50, signY + 8);
      doc.text('HIRER / CUSTOMER SIGNATURE', 325, signY + 8);

      doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8');
      doc.text(`Staff: ${booking.createdByUser.fullName}`, 50, signY + 54);
      doc.text('DrivePulse Fleet Operations', 50, signY + 63);

      doc.text(`Customer: ${booking.customer.fullName}`, 325, signY + 54);
      doc.text('I accept all rental terms and conditions stated above.', 325, signY + 63);

      doc.end();
    });
  }

  /**
   * Generates a formal Payment Receipt PDF
   */
  public static async generatePaymentReceipt(payment: PaymentWithDetails): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Payment Receipt - ${payment.receiptNumber}`,
          Author: 'DrivePulse Rental Management',
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);

      const formatCurrency = (amt: number) => `INR ${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

      // Header
      doc.rect(40, 40, 515, 60).fill('#0f172a');
      doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text('DRIVEPULSE CAR RENTALS', 55, 52);
      doc.fontSize(8).font('Helvetica').fillColor('#94a3b8').text('Official Payment & Transaction Receipt | GSTIN: 29AABCU9603R1ZM', 55, 74);
      doc.text('Outer Ring Road, Bengaluru, Karnataka 560103 | +91 98765 43210', 55, 86);

      // Receipt Title Box
      doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('PAYMENT RECEIPT', 40, 115);

      doc.roundedRect(360, 108, 195, 30, 4).lineWidth(1).stroke('#e2e8f0');
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('RECEIPT NO:', 370, 113);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#059669').text(payment.receiptNumber, 445, 112);
      doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(`Mode: ${payment.mode}`, 370, 126);
      doc.text(`Date: ${formatDate(payment.paymentDate)}`, 445, 126);

      // Details Box
      const boxY = 150;
      doc.roundedRect(40, boxY, 515, 140, 4).fillAndStroke('#f8fafc', '#cbd5e1');

      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('PAYMENT & TRANSACTION PARTICULARS', 55, boxY + 12);
      
      const leftColX = 55;
      const rightColX = 310;
      let curY = boxY + 34;

      doc.font('Helvetica').fontSize(9).fillColor('#475569');
      doc.text('Customer Name:', leftColX, curY);
      doc.font('Helvetica-Bold').fillColor('#0f172a').text(payment.booking.customer.fullName, leftColX + 90, curY);

      doc.font('Helvetica').fillColor('#475569').text('Booking Number:', rightColX, curY);
      doc.font('Helvetica-Bold').fillColor('#0284c7').text(payment.booking.bookingNumber, rightColX + 95, curY);

      curY += 18;
      doc.font('Helvetica').fillColor('#475569').text('Customer Phone:', leftColX, curY);
      doc.font('Helvetica-Bold').fillColor('#0f172a').text(payment.booking.customer.phone, leftColX + 90, curY);

      doc.font('Helvetica').fillColor('#475569').text('Vehicle Reg:', rightColX, curY);
      doc.font('Helvetica-Bold').fillColor('#0f172a').text(payment.booking.vehicle.registrationNumber, rightColX + 95, curY);

      curY += 18;
      doc.font('Helvetica').fillColor('#475569').text('Payment Purpose:', leftColX, curY);
      doc.font('Helvetica-Bold').fillColor('#059669').text(payment.type, leftColX + 90, curY);

      doc.font('Helvetica').fillColor('#475569').text('Txn Reference:', rightColX, curY);
      doc.font('Helvetica-Bold').fillColor('#0f172a').text(payment.transactionReference || 'N/A (Cash / Counter)', rightColX + 95, curY);

      curY += 18;
      doc.font('Helvetica').fillColor('#475569').text('Cashier / Staff:', leftColX, curY);
      doc.font('Helvetica-Bold').fillColor('#0f172a').text(payment.receivedByUser.fullName, leftColX + 90, curY);

      doc.font('Helvetica').fillColor('#475569').text('Remaining Due:', rightColX, curY);
      doc.font('Helvetica-Bold').fillColor(payment.booking.balanceDue > 0 ? '#d97706' : '#059669').text(
        formatCurrency(payment.booking.balanceDue),
        rightColX + 95,
        curY
      );

      // Big Amount Banner
      const amtY = boxY + 160;
      doc.roundedRect(40, amtY, 515, 60, 6).fill('#059669');
      doc.fillColor('#ffffff').fontSize(12).font('Helvetica').text('AMOUNT RECEIVED', 55, amtY + 14);
      doc.fontSize(22).font('Helvetica-Bold').text(formatCurrency(payment.amount), 55, amtY + 28);
      doc.fontSize(10).font('Helvetica').text(`Payment Mode: ${payment.mode} | Verified`, 340, amtY + 25);

      if (payment.notes) {
        doc.roundedRect(40, amtY + 75, 515, 40, 4).fillAndStroke('#f1f5f9', '#e2e8f0');
        doc.fillColor('#475569').fontSize(8.5).font('Helvetica').text(`Staff Notes: ${payment.notes}`, 50, amtY + 88);
      }

      // Footer Signatures
      const fY = 500;
      doc.moveTo(40, fY).lineTo(240, fY).stroke('#cbd5e1');
      doc.moveTo(355, fY).lineTo(555, fY).stroke('#cbd5e1');

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b');
      doc.text('RECEIVED BY (AUTHORIZED CAHIER)', 40, fY + 6);
      doc.text('CUSTOMER ACKNOWLEDGMENT', 355, fY + 6);

      doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8');
      doc.text(`Staff: ${payment.receivedByUser.fullName}`, 40, fY + 18);
      doc.text('DrivePulse Car Rentals Operations', 40, fY + 28);

      doc.text(`Customer: ${payment.booking.customer.fullName}`, 355, fY + 18);
      doc.text('Payment verified against booking ledger', 355, fY + 28);

      doc.end();
    });
  }

  /**
   * Generates a standard Indian GST Tax Invoice PDF
   */
  public static async generateGstTaxInvoice(invoice: InvoiceWithDetails): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Tax Invoice - ${invoice.invoiceNumber}`,
          Author: 'DrivePulse Rental Management',
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);

      const formatCurrency = (amt: number) => `INR ${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

      // Top Tag
      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('TAX INVOICE  (ORIGINAL FOR RECIPIENT)', 40, 30, { align: 'center', width: 515 });

      // Header Block
      doc.rect(40, 45, 515, 65).fill('#0f172a');
      doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text('DRIVEPULSE LUXURY & COMMERCIAL CAR RENTALS', 55, 55);
      doc.fontSize(8).font('Helvetica').fillColor('#94a3b8').text('Outer Ring Road, Bengaluru, Karnataka 560103 | Phone: +91 98765 43210', 55, 75);
      doc.text('GSTIN: 29AABCU9603R1ZM | State: Karnataka (Code: 29) | PAN: AABCU9603R', 55, 87);

      // Invoice Meta Table
      const metaY = 115;
      doc.rect(40, metaY, 260, 85).lineWidth(0.5).stroke('#cbd5e1');
      doc.rect(300, metaY, 255, 85).lineWidth(0.5).stroke('#cbd5e1');

      // Left: Billed to Customer
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('BILLED TO (BUYER DETAILS):', 50, metaY + 8);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text(invoice.booking.customer.fullName, 50, metaY + 22);
      doc.font('Helvetica').fontSize(8).fillColor('#475569');
      doc.text(invoice.booking.customer.address.substring(0, 50), 50, metaY + 35);
      doc.text(`Phone: ${invoice.booking.customer.phone}`, 50, metaY + 47);
      doc.text(`State: Karnataka (Code: 29)`, 50, metaY + 59);
      if (invoice.customerGstin) {
        doc.font('Helvetica-Bold').fillColor('#0284c7').text(`Buyer GSTIN: ${invoice.customerGstin}`, 50, metaY + 71);
      } else {
        doc.text('Buyer Type: B2C Consumer (Unregistered)', 50, metaY + 71);
      }

      // Right: Invoice Meta
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('INVOICE PARTICULARS:', 310, metaY + 8);
      doc.font('Helvetica').fontSize(8).fillColor('#475569');
      doc.text('Invoice Number:', 310, metaY + 22);
      doc.font('Helvetica-Bold').fillColor('#0f172a').text(invoice.invoiceNumber, 410, metaY + 22);

      doc.font('Helvetica').fillColor('#475569').text('Invoice Date:', 310, metaY + 35);
      doc.font('Helvetica-Bold').fillColor('#0f172a').text(formatDate(invoice.invoiceDate), 410, metaY + 35);

      doc.font('Helvetica').fillColor('#475569').text('Booking Ref:', 310, metaY + 47);
      doc.font('Helvetica-Bold').fillColor('#0284c7').text(invoice.booking.bookingNumber, 410, metaY + 47);

      doc.font('Helvetica').fillColor('#475569').text('Vehicle Reg:', 310, metaY + 59);
      doc.font('Helvetica-Bold').fillColor('#0f172a').text(invoice.booking.vehicle.registrationNumber, 410, metaY + 59);

      doc.font('Helvetica').fillColor('#475569').text('Place of Supply:', 310, metaY + 71);
      doc.font('Helvetica-Bold').fillColor('#0f172a').text('29 - Karnataka (Intra-state)', 410, metaY + 71);

      // Line items table
      const tblY = 210;
      doc.rect(40, tblY, 515, 20).fill('#0f172a');
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
      doc.text('#', 45, tblY + 6);
      doc.text('Description of Supply / Service', 65, tblY + 6);
      doc.text('SAC Code', 260, tblY + 6);
      doc.text('Qty / Days', 320, tblY + 6);
      doc.text('Taxable Val', 390, tblY + 6);
      doc.text('Total (INR)', 485, tblY + 6);

      let curY = tblY + 24;
      let slNo = 1;

      const addTblRow = (desc: string, sac: string, qty: string, taxable: number, total: number) => {
        doc.font('Helvetica').fontSize(8).fillColor('#334155');
        doc.text(String(slNo++), 45, curY);
        doc.text(desc, 65, curY, { width: 190 });
        doc.text(sac, 260, curY);
        doc.text(qty, 320, curY);
        doc.text(taxable.toFixed(2), 390, curY);
        doc.text(total.toFixed(2), 485, curY);
        curY += 16;
      };

      const baseVal = invoice.booking.rentalDays * invoice.booking.baseRate;
      addTblRow(
        `Rental Services of Passenger Car: ${invoice.booking.vehicle.make} ${invoice.booking.vehicle.model}`,
        '996601',
        `${invoice.booking.rentalDays} Days`,
        baseVal,
        baseVal
      );

      if (invoice.booking.withDriver) {
        const dVal = invoice.booking.rentalDays * invoice.booking.driverAllowancePerDay;
        addTblRow('Passenger Transport Chauffeur / Driver Allowance', '996601', `${invoice.booking.rentalDays} Days`, dVal, dVal);
      }

      invoice.booking.extras.forEach((ex) => {
        addTblRow(`Add-on Service: ${ex.name}`, '996601', `${ex.quantity} unit`, ex.totalAmount, ex.totalAmount);
      });

      // Horizontal line
      doc.moveTo(40, curY + 2).lineTo(555, curY + 2).lineWidth(0.5).stroke('#cbd5e1');
      curY += 8;

      // Tax Table Box
      const taxBoxY = curY;
      doc.rect(40, taxBoxY, 515, 80).fillAndStroke('#f8fafc', '#e2e8f0');

      doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold');
      doc.text('TAX SUMMARY (GST 18%)', 50, taxBoxY + 8);

      doc.font('Helvetica').fontSize(8).fillColor('#475569');
      doc.text(`Taxable Amount (Subtotal):`, 50, taxBoxY + 24);
      doc.text(formatCurrency(invoice.subtotal), 220, taxBoxY + 24);

      doc.text(`Central GST (CGST @ 9%):`, 50, taxBoxY + 38);
      doc.text(formatCurrency(invoice.cgstAmount), 220, taxBoxY + 38);

      doc.text(`State GST (SGST @ 9%):`, 50, taxBoxY + 52);
      doc.text(formatCurrency(invoice.sgstAmount), 220, taxBoxY + 52);

      doc.text(`Integrated GST (IGST @ 0%):`, 50, taxBoxY + 66);
      doc.text(formatCurrency(invoice.igstAmount), 220, taxBoxY + 66);

      // Total Callout
      doc.rect(320, taxBoxY + 15, 220, 50).fill('#0f172a');
      doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('TOTAL INVOICE VALUE', 335, taxBoxY + 24);
      doc.fillColor('#38bdf8').fontSize(16).font('Helvetica-Bold').text(formatCurrency(invoice.totalAmount), 335, taxBoxY + 38);

      curY = taxBoxY + 95;

      // Bank Details & Remittance
      doc.roundedRect(40, curY, 250, 80, 4).fillAndStroke('#f1f5f9', '#cbd5e1');
      doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text('BANK REMITTANCE DETAILS', 50, curY + 8);
      doc.font('Helvetica').fontSize(7.5).fillColor('#475569');
      doc.text('Beneficiary: DrivePulse Rentals Pvt Ltd', 50, curY + 22);
      doc.text('Bank Name: HDFC Bank Ltd, Outer Ring Road Branch', 50, curY + 34);
      doc.text('Account Number: 50200012345678 (Current Account)', 50, curY + 46);
      doc.text('IFSC Code: HDFC0001234 | UPI: drivepulse@hdfcbank', 50, curY + 58);
      doc.text('RTGS / NEFT / IMPS transfers accepted', 50, curY + 70);

      // Authorized Signatory
      doc.roundedRect(305, curY, 250, 80, 4).fillAndStroke('#f1f5f9', '#cbd5e1');
      doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text('FOR DRIVEPULSE RENTALS PVT LTD', 315, curY + 8);
      doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8');
      doc.text('Authorized Finance Signatory', 315, curY + 58);
      doc.text('This is a digitally generated tax invoice under GST Rules.', 315, curY + 70);

      doc.end();
    });
  }
}
