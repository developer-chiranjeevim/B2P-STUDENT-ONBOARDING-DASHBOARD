interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
}

interface PaymentData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface PaymentVerificationResult {
  success: boolean;
  message: string;
  orderId?: string;
  paymentId?: string;
}



const API_URL = `${import.meta.env.VITE_MEETINGS_API}/payments`
const fetchRazorpayKey = async () => {
    try {
      const response = await fetch(`${API_URL}/get-razorpay-key`);
      const data: { key: string } = await response.json();
      return data.key
    } catch (error) {
      console.error('Error fetching Razorpay key:', error);
      
    }
};

const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
};

const createOrder = async (amount: number): Promise<RazorpayOrder> => {
    try {
      const response = await fetch(`${API_URL}/make-payment `, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          currency: 'INR',
          receipt: `receipt_${Date.now()}`,
          notes: {
            customer_name: "chiranjeevi",
            customer_email: "test@b2p.com"
          }
        })
      });

      const data: { success: boolean; order: RazorpayOrder; message?: string } = 
        await response.json();
      
      if (data.success) {
        return data.order;
      } else {
        throw new Error(data.message || 'Failed to create order');
      }
    } catch (error) {
      console.error('Create order error:', error);
      throw error;
    }
};

const verifyPayment = async (paymentData: PaymentData): Promise<PaymentVerificationResult> => {
  try {
    const response = await fetch(`${API_URL}/verify-payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData),
    });

    const data: PaymentVerificationResult = await response.json();
    return data;
  } catch (error) {
    console.error('Verify payment error:', error);
    throw error;
  }
};


export {fetchRazorpayKey, loadRazorpayScript, createOrder, verifyPayment }