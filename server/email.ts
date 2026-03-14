import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.log("[email] EMAIL_USER or EMAIL_PASS not set — emails will be logged to console");
    return null;
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  return transporter;
}

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const t = getTransporter();

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 30px; background: #fafafa; border: 1px solid #eee;">
      <h1 style="text-align: center; font-size: 24px; letter-spacing: 4px; margin-bottom: 8px;">LUCERNE BOUTIQUE</h1>
      <p style="text-align: center; color: #888; font-size: 13px; margin-bottom: 30px;">لوسيرن بوتيك</p>
      <hr style="border: none; border-top: 1px solid #ddd; margin-bottom: 30px;" />
      <p style="font-size: 15px; color: #333;">Your verification code is:</p>
      <div style="text-align: center; margin: 24px 0;">
        <span style="font-size: 36px; letter-spacing: 8px; font-weight: bold; color: #111;">${code}</span>
      </div>
      <p style="font-size: 13px; color: #888;">This code will be used to verify your email address. If you did not request this, please ignore this email.</p>
    </div>
  `;

  if (!t) {
    console.log(`[email] Verification code for ${to}: ${code}`);
    return;
  }

  await t.sendMail({
    from: `"Lucerne Boutique" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Verify your email - Lucerne Boutique",
    html,
  });
}

export async function sendPasswordResetCode(to: string, code: string): Promise<void> {
  const t = getTransporter();

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 30px; background: #fafafa; border: 1px solid #eee;">
      <h1 style="text-align: center; font-size: 24px; letter-spacing: 4px; margin-bottom: 8px;">LUCERNE BOUTIQUE</h1>
      <p style="text-align: center; color: #888; font-size: 13px; margin-bottom: 30px;">لوسيرن بوتيك</p>
      <hr style="border: none; border-top: 1px solid #ddd; margin-bottom: 30px;" />
      <p style="font-size: 15px; color: #333;">رمز إعادة تعيين كلمة المرور / Your password reset code:</p>
      <div style="text-align: center; margin: 24px 0;">
        <span style="font-size: 36px; letter-spacing: 8px; font-weight: bold; color: #111;">${code}</span>
      </div>
      <p style="font-size: 13px; color: #888;">This code expires in 15 minutes. If you did not request a password reset, please ignore this email.</p>
    </div>
  `;

  if (!t) {
    console.log(`[email] Password reset code for ${to}: ${code}`);
    return;
  }

  await t.sendMail({
    from: `"Lucerne Boutique" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Reset your password - Lucerne Boutique",
    html,
  });
}

export async function sendOrderNotification(orderDetails: {
  orderId: number;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  totalAmount: string;
  paymentMethod: string;
  items: { name: string; quantity: number; price: string; size?: string | null; color?: string | null }[];
}): Promise<void> {
  const t = getTransporter();
  const adminEmail = "mohammad.adeela@gmail.com";

  const itemsHtml = orderDetails.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.size || "-"} / ${item.color || "-"}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: end;">₪${item.price}</td>
    </tr>
  `).join("");

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #fafafa; border: 1px solid #eee;">
      <h1 style="font-size: 20px; letter-spacing: 3px; margin-bottom: 4px;">LUCERNE BOUTIQUE</h1>
      <p style="color: #888; font-size: 12px; margin-bottom: 20px;">طلب جديد — New Order</p>
      <hr style="border: none; border-top: 1px solid #ddd; margin-bottom: 20px;" />
      <h2 style="font-size: 16px;">Order #${orderDetails.orderId}</h2>
      <table style="width: 100%; font-size: 14px; margin-bottom: 16px;">
        <tr><td style="color: #888; padding: 4px 0;">Customer:</td><td>${orderDetails.customerName}</td></tr>
        <tr><td style="color: #888; padding: 4px 0;">Phone:</td><td>${orderDetails.phone}</td></tr>
        <tr><td style="color: #888; padding: 4px 0;">Address:</td><td>${orderDetails.address}, ${orderDetails.city}</td></tr>
        <tr><td style="color: #888; padding: 4px 0;">Payment:</td><td>${orderDetails.paymentMethod}</td></tr>
      </table>
      <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-bottom: 16px;">
        <thead>
          <tr style="background: #f0f0f0;">
            <th style="padding: 8px; text-align: start;">Product</th>
            <th style="padding: 8px; text-align: center;">Qty</th>
            <th style="padding: 8px; text-align: start;">Size/Color</th>
            <th style="padding: 8px; text-align: end;">Price</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="text-align: end; font-size: 18px; font-weight: bold; padding: 12px 0; border-top: 2px solid #333;">
        Total: ₪${orderDetails.totalAmount}
      </div>
    </div>
  `;

  if (!t) {
    console.log(`[email] Order notification for order #${orderDetails.orderId} — Total: ₪${orderDetails.totalAmount}`);
    console.log(`[email] Customer: ${orderDetails.customerName}, ${orderDetails.phone}, ${orderDetails.address}, ${orderDetails.city}`);
    return;
  }

  await t.sendMail({
    from: `"Lucerne Boutique" <${process.env.EMAIL_USER}>`,
    to: adminEmail,
    subject: `New Order #${orderDetails.orderId} — ₪${orderDetails.totalAmount}`,
    html,
  });
}

export async function sendOrderConfirmationToCustomer(customerEmail: string, orderDetails: {
  orderId: number;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  totalAmount: string;
  shippingCost: string;
  shippingRegion: string;
  paymentMethod: string;
  items: { name: string; quantity: number; price: string; size?: string | null; color?: string | null }[];
}): Promise<void> {
  const t = getTransporter();

  const subtotal = orderDetails.items.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);

  const itemsHtml = orderDetails.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.size || "-"} / ${item.color || "-"}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: end;">₪${(Number(item.price) * item.quantity).toFixed(2)}</td>
    </tr>
  `).join("");

  const regionNames: Record<string, string> = {
    westBank: "الضفة الغربية",
    jerusalem: "القدس",
    interior: "الداخل",
  };

  const html = `
    <div dir="rtl" style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #fafafa; border: 1px solid #eee;">
      <h1 style="text-align: center; font-size: 22px; letter-spacing: 4px; margin-bottom: 8px;">LUCERNE BOUTIQUE</h1>
      <p style="text-align: center; color: #888; font-size: 13px; margin-bottom: 20px;">لوسيرن بوتيك</p>
      <hr style="border: none; border-top: 1px solid #ddd; margin-bottom: 20px;" />

      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="font-size: 18px; color: #333; margin-bottom: 4px;">تم استلام طلبك بنجاح!</h2>
        <p style="font-size: 14px; color: #888;">رقم الطلب: <strong style="color: #333;">#${orderDetails.orderId.toString().padStart(6, '0')}</strong></p>
        <p style="font-size: 13px; color: #888;">الحالة: <strong style="color: #D4A574;">بالانتظار</strong></p>
      </div>

      <table style="width: 100%; font-size: 14px; margin-bottom: 16px; border-collapse: collapse;">
        <tr><td style="color: #888; padding: 6px 0;">الاسم:</td><td style="text-align: start;">${orderDetails.customerName}</td></tr>
        <tr><td style="color: #888; padding: 6px 0;">الهاتف:</td><td style="text-align: start;">${orderDetails.phone}</td></tr>
        <tr><td style="color: #888; padding: 6px 0;">العنوان:</td><td style="text-align: start;">${orderDetails.address}, ${orderDetails.city}</td></tr>
        <tr><td style="color: #888; padding: 6px 0;">المنطقة:</td><td style="text-align: start;">${regionNames[orderDetails.shippingRegion] || orderDetails.shippingRegion}</td></tr>
        <tr><td style="color: #888; padding: 6px 0;">طريقة الدفع:</td><td style="text-align: start;">${orderDetails.paymentMethod}</td></tr>
      </table>

      <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-bottom: 16px;">
        <thead>
          <tr style="background: #f0f0f0;">
            <th style="padding: 10px; text-align: start;">المنتج</th>
            <th style="padding: 10px; text-align: center;">الكمية</th>
            <th style="padding: 10px; text-align: start;">المقاس/اللون</th>
            <th style="padding: 10px; text-align: end;">السعر</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <div style="border-top: 1px solid #ddd; padding-top: 12px; font-size: 14px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: #888;">المجموع الفرعي:</span>
          <span>₪${subtotal.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: #888;">الشحن (${regionNames[orderDetails.shippingRegion] || orderDetails.shippingRegion}):</span>
          <span>₪${Number(orderDetails.shippingCost).toFixed(2)}</span>
        </div>
      </div>
      <div style="text-align: end; font-size: 20px; font-weight: bold; padding: 14px 0; border-top: 2px solid #333;">
        الإجمالي: ₪${orderDetails.totalAmount}
      </div>

      <p style="text-align: center; font-size: 12px; color: #aaa; margin-top: 20px;">شكراً لتسوقك من لوسيرن بوتيك ♥</p>
    </div>
  `;

  if (!t) {
    console.log(`[email] Order confirmation for customer ${customerEmail} — Order #${orderDetails.orderId}`);
    return;
  }

  await t.sendMail({
    from: `"Lucerne Boutique" <${process.env.EMAIL_USER}>`,
    to: customerEmail,
    subject: `تأكيد طلبك #${orderDetails.orderId.toString().padStart(6, '0')} — Lucerne Boutique`,
    html,
  });
}
