import { useState } from 'react';
import { UserCircle, Mail, GraduationCap, Users, BookOpen, CheckCircle2, ArrowRight, ArrowLeft, Copy, Check, KeyRound, PartyPopper, X, AlertCircle, IndianRupee } from 'lucide-react';
import { handleFormSubmit } from "./apis/handleFormSubmit";
import { fetchRazorpayKey, loadRazorpayScript, createOrder, verifyPayment  } from "./apis/HandlePayments";

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

interface CustomerInfo {
  name: string;
  email: string;
  contact: string;
}

interface PaymentStatus {
  success: boolean;
  message: string;
  orderId?: string;
  paymentId?: string;
}

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => Promise<void>;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  modal: {
    ondismiss: () => void;
  };
}

// Extend Window interface
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open: () => void;
    };
  }
}


interface FormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phone: string;
  address: string;
  grade: string;
  previousSchool: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  relationship: string;
  subjects: string[];
  hobbies: string;
  goals: string;
  password: string;
  course: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  grade?: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  [key: string]: string | undefined;
}

// Validation functions
const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePhone = (phone: string): boolean => {
  const re = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/;
  return re.test(phone);
};

const validateDateOfBirth = (dob: string): boolean => {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age >= 5 && age <= 25; // Assuming students are between 5-25 years old
};

export default function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [openSelect, setOpenSelect] = useState<string | null>(null);
  const [onLoad, setOnload] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [paymentCompleted, setPaymentCompleted] = useState<boolean>(false);
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    email: '',
    phone: '',
    address: '',
    grade: '',
    previousSchool: '',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    relationship: '',
    subjects: [],
    hobbies: '',
    goals: '',
    password: '',
    course: ''
  });

  const steps = [
    { title: 'Personal Info', icon: UserCircle },
    { title: 'Contact Details', icon: Mail },
    { title: 'Academic Info', icon: GraduationCap },
    { title: 'Parent/Guardian', icon: Users },
    { title: 'Interests & Goals', icon: BookOpen },
    { title: 'Payments', icon: IndianRupee }
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof FormErrors];
        return newErrors;
      });
    }
  };

  const toggleSubject = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};
    
    if (step === 0) {
      if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
      if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
      if (!formData.dateOfBirth) {
        newErrors.dateOfBirth = 'Date of birth is required';
      } else if (!validateDateOfBirth(formData.dateOfBirth)) {
        newErrors.dateOfBirth = 'Please enter a valid date of birth (age 5-25)';
      }
    } else if (step === 1) {
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!validateEmail(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
      if (formData.phone && !validatePhone(formData.phone)) {
        newErrors.phone = 'Please enter a valid phone number';
      }
    } else if (step === 2) {
      if (!formData.grade) newErrors.grade = 'Grade is required';
    } else if (step === 3) {
      if (!formData.parentName.trim()) newErrors.parentName = "Parent/Guardian name is required";
      if (!formData.parentEmail) {
        newErrors.parentEmail = 'Parent email is required';
      } else if (!validateEmail(formData.parentEmail)) {
        newErrors.parentEmail = 'Please enter a valid email address';
      }
      if (!formData.parentPhone) {
        newErrors.parentPhone = 'Parent phone number is required';
      } else if (!validatePhone(formData.parentPhone)) {
        newErrors.parentPhone = 'Please enter a valid phone number';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateStep(currentStep);
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

const handleSubmit = async() => {
    // Validate all steps before submission
    let isValid = true;
    for (let i = 0; i < steps.length; i++) {
      if (!validateStep(i)) {
        setCurrentStep(i);
        isValid = false;
        break;
      }
    }
    
    if (!isValid) return;
    
    setOnload(true);
    try {
      const newPassword = generatePassword();
      setGeneratedPassword(newPassword);
      let finalData = { ...formData, password: newPassword };
      console.log(finalData);
      
      // Only process payment if not already completed
      if (!paymentCompleted) {
        const razorPayKey = await fetchRazorpayKey();
        const scriptLoaded: boolean = await loadRazorpayScript();
        if(!scriptLoaded){
          alert("Error Loading RazorPay Script");
          setOnload(false);
          return;
        }
        
        if(razorPayKey){
          const order: RazorpayOrder = await createOrder();
          
          const options: RazorpayOptions = {
            key: razorPayKey,
            amount: order.amount,
            currency: order.currency,
            name: 'B2P TEACHERS',
            description: '100 Days Payment Plan',
            order_id: order.id,
            handler: async function (response: RazorpayResponse): Promise<void> {
              // Verify payment on backend
              const verificationResult: PaymentVerificationResult =
                await verifyPayment({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                });

              if(verificationResult){
                console.log("payment Success");
                setPaymentCompleted(true); // Mark payment as completed
                
                // Submit form after successful payment
                const submitResponse = await handleFormSubmit(finalData);
                console.log(submitResponse);
                
                if (submitResponse?.status) {
                  setShowSuccessModal(true);
                } else if (!submitResponse?.status && submitResponse?.statusCode === 409) {
                  setErrors(prev => ({ ...prev, email: 'This email is already registered' }));
                  setCurrentStep(1); // Go back to email step
                }
                setOnload(false);
              }
            },
            prefill: {
              name: "chiranjeevi",
              email:  "test@b2p.com",
              contact:  "1234566778909",
            },
            theme: {
              color: '#3b82f6',
            },
            modal: {
              ondismiss: function (): void {
                console.log({
                  success: false,
                  message: 'Payment cancelled by user',
                });
                setOnload(false);
              },
            },
          };
    
          const razorpay = new window.Razorpay(options);
          razorpay.open();
          return; // Exit early since form submission happens in handler
        }
      } else {
        // Payment already completed, directly submit form
        const response = await handleFormSubmit(finalData);
        console.log(response);
        
        if (response?.status) {
          setShowSuccessModal(true);
          setPaymentCompleted(false); // Reset for next user
        } else if (!response?.status && response?.statusCode === 409) {
          setErrors(prev => ({ ...prev, email: 'This email is already registered' }));
          setCurrentStep(1); // Go back to email step
        }
      }
      
    } catch (error) {
      console.error('Error submitting form:', error);
      // Handle error state if needed
    } finally {
      setOnload(false);
    }
  };

  const handleCopyEmail = async () => {
    await navigator.clipboard.writeText(formData.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyPassword = async () => {
    await navigator.clipboard.writeText(generatedPassword);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
  };

  const SelectComponent = ({ 
    value, 
    onChange, 
    placeholder, 
    options,
    id 
  }: { 
    value: string; 
    onChange: (val: string) => void; 
    placeholder: string; 
    options: { value: string; label: string }[];
    id: string;
  }) => {
    const isOpen = openSelect === id;
    
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenSelect(isOpen ? null : id)}
          className="w-full mt-2 px-4 py-2 text-left bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-all"
        >
          <span className={value ? 'text-gray-900' : 'text-gray-400'}>
            {value ? options.find(o => o.value === value)?.label : placeholder}
          </span>
        </button>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setOpenSelect(null)}
            />
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto animate-in fade-in slide-in-from-top-2 duration-200">
              {options.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpenSelect(null);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div 
            key="step0"
            className=" space-y-6 animate-in fade-in slide-in-from-right-5 duration-300"
          >
            <div className="text-center mb-8">
              <div className="inline-block animate-in zoom-in duration-500 delay-200">
                <UserCircle className="w-16 h-16 mx-auto mb-4 text-blue-400" />
              </div>
              <h2 className="text-3xl font-bold text-blue-600 mb-2">Let's Get to Know You!</h2>
              <p className="text-gray-600">Tell us about yourself</p>
            </div>
            <div className="space-y-6">
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 delay-100">
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name *
                </label>
                <div className="relative">
                  <input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => updateFormData('firstName', e.target.value)}
                    onBlur={() => handleBlur('firstName')}
                    className={`mt-2 w-full px-4 py-2 border ${
                      errors.firstName ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                  />
                  {errors.firstName && touched.firstName && (
                    <div className="flex items-center mt-1 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.firstName}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 delay-200">
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name *
                </label>
                <div className="relative">
                  <input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => updateFormData('lastName', e.target.value)}
                    onBlur={() => handleBlur('lastName')}
                    className={`mt-2 w-full px-4 py-2 border ${
                      errors.lastName ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                  />
                  {errors.lastName && touched.lastName && (
                    <div className="flex items-center mt-1 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.lastName}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 delay-300">
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
                  Date of Birth *
                </label>
                <div className="relative">
                  <input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                    onBlur={() => handleBlur('dateOfBirth')}
                    max={new Date().toISOString().split('T')[0]}
                    className={`mt-2 w-full px-4 py-2 border ${
                      errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                  />
                  {errors.dateOfBirth && touched.dateOfBirth && (
                    <div className="flex items-center mt-1 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.dateOfBirth}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 delay-500">
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                  Gender
                </label>
                <SelectComponent
                  id="gender"
                  value={formData.gender}
                  onChange={(value) => updateFormData('gender', value)}
                  placeholder="Select gender"
                  options={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' },
                    { value: 'prefer-not-to-say', label: 'Prefer not to say' }
                  ]}
                />
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div 
            key="step1"
            className="space-y-6 animate-in fade-in slide-in-from-right-5 duration-300"
          >
            <div className="text-center mb-8">
              <div className="inline-block animate-in zoom-in duration-500 delay-200">
                <Mail className="w-16 h-16 mx-auto mb-4 text-green-400" />
              </div>
              <h2 className="text-3xl font-bold text-green-600 mb-2">Contact Information</h2>
              <p className="text-gray-600">How can we reach you?</p>
            </div>
            <div className="space-y-6">
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 delay-100">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address *
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    placeholder="john.doe@example.com"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    className={`mt-2 w-full px-4 py-2 border ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all`}
                  />
                  {errors.email && touched.email && (
                    <div className="flex items-center mt-1 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.email}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 delay-200">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => updateFormData('phone', e.target.value)}
                    onBlur={() => handleBlur('phone')}
                    className={`mt-2 w-full px-4 py-2 border ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all`}
                  />
                  {errors.phone && touched.phone && (
                    <div className="flex items-center mt-1 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.phone}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 delay-300">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <textarea
                  id="address"
                  placeholder="Your full address"
                  value={formData.address}
                  onChange={(e) => updateFormData('address', e.target.value)}
                  className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all min-h-[100px] resize-none"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div 
            key="step2"
            className="space-y-6 animate-in fade-in slide-in-from-right-5 duration-300"
          >
            <div className="text-center mb-8">
              <div className="inline-block animate-in zoom-in duration-500 delay-200">
                <GraduationCap className="w-16 h-16 mx-auto mb-4 text-purple-400" />
              </div>
              <h2 className="text-3xl font-bold text-purple-600 mb-2">Academic Background</h2>
              <p className="text-gray-600">Tell us about your education</p>
            </div>
            <div className="space-y-6">
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 delay-100">
                <label htmlFor="grade" className="block text-sm font-medium text-gray-700">
                  Current Grade/Class *
                </label>
                <div className="relative">
                  <SelectComponent
                    id="grade"
                    value={formData.grade}
                    onChange={(value) => {
                      updateFormData('grade', value);
                      // Clear error when a grade is selected
                      if (errors.grade) {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.grade;
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="Select your grade"
                    options={[
                      { value: 'kindergarten', label: 'Kindergarten' },
                      { value: '1', label: 'Grade 1' },
                      { value: '2', label: 'Grade 2' },
                      { value: '3', label: 'Grade 3' },
                      { value: '4', label: 'Grade 4' },
                      { value: '5', label: 'Grade 5' },
                      { value: '6', label: 'Grade 6' },
                      { value: '7', label: 'Grade 7' },
                      { value: '8', label: 'Grade 8' },
                      { value: '9', label: 'Grade 9' },
                      { value: '10', label: 'Grade 10' },
                      { value: '11', label: 'Grade 11' },
                      { value: '12', label: 'Grade 12' }
                    ]}
                  />
                  {errors.grade && touched.grade && (
                    <div className="flex items-center mt-1 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.grade}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 delay-200">
                <label htmlFor="previousSchool" className="block text-sm font-medium text-gray-700">
                  Previous School (if any)
                </label>
                <input
                  id="previousSchool"
                  type="text"
                  placeholder="Name of your previous school"
                  value={formData.previousSchool}
                  onChange={(e) => updateFormData('previousSchool', e.target.value)}
                  className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div 
            key="step3"
            className="space-y-6 animate-in fade-in slide-in-from-right-5 duration-300"
          >
            <div className="text-center mb-8">
              <div className="inline-block animate-in zoom-in duration-500 delay-200">
                <Users className="w-16 h-16 mx-auto mb-4 text-orange-400" />
              </div>
              <h2 className="text-3xl font-bold text-orange-600 mb-2">Parent/Guardian Details</h2>
              <p className="text-gray-600">Who should we contact?</p>
            </div>
            <div className="space-y-6">
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 delay-100">
                <label htmlFor="parentName" className="block text-sm font-medium text-gray-700">
                  Parent/Guardian Name *
                </label>
                <div className="relative">
                  <input
                    id="parentName"
                    type="text"
                    placeholder="Full name"
                    value={formData.parentName}
                    onChange={(e) => updateFormData('parentName', e.target.value)}
                    onBlur={() => handleBlur('parentName')}
                    className={`mt-2 w-full px-4 py-2 border ${
                      errors.parentName ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all`}
                  />
                  {errors.parentName && touched.parentName && (
                    <div className="flex items-center mt-1 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.parentName}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 delay-200">
                <label htmlFor="relationship" className="block text-sm font-medium text-gray-700">
                  Relationship
                </label>
                <SelectComponent
                  id="relationship"
                  value={formData.relationship}
                  onChange={(value) => updateFormData('relationship', value)}
                  placeholder="Select relationship"
                  options={[
                    { value: 'mother', label: 'Mother' },
                    { value: 'father', label: 'Father' },
                    { value: 'guardian', label: 'Legal Guardian' },
                    { value: 'other', label: 'Other' }
                  ]}
                />
              </div>
              
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 delay-300">
                <label htmlFor="parentEmail" className="block text-sm font-medium text-gray-700">
                  Parent Email *
                </label>
                <div className="relative">
                  <input
                    id="parentEmail"
                    type="email"
                    placeholder="parent@example.com"
                    value={formData.parentEmail}
                    onChange={(e) => updateFormData('parentEmail', e.target.value)}
                    onBlur={() => handleBlur('parentEmail')}
                    className={`mt-2 w-full px-4 py-2 border ${
                      errors.parentEmail ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all`}
                  />
                  {errors.parentEmail && touched.parentEmail && (
                    <div className="flex items-center mt-1 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.parentEmail}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 delay-400">
                <label htmlFor="parentPhone" className="block text-sm font-medium text-gray-700">
                  Parent Phone Number *
                </label>
                <div className="relative">
                  <input
                    id="parentPhone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={formData.parentPhone}
                    onChange={(e) => updateFormData('parentPhone', e.target.value)}
                    onBlur={() => handleBlur('parentPhone')}
                    className={`mt-2 w-full px-4 py-2 border ${
                      errors.parentPhone ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all`}
                  />
                  {errors.parentPhone && touched.parentPhone && (
                    <div className="flex items-center mt-1 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.parentPhone}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div 
            key="step4"
            className="space-y-6 animate-in fade-in slide-in-from-right-5 duration-300"
          >
            <div className="text-center mb-8">
              <div className="inline-block animate-in zoom-in duration-500 delay-200">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-blue-400" />
              </div>
              <h2 className="text-3xl font-bold text-blue-600 mb-2">Interests & Goals</h2>
              <p className="text-gray-600">What are you passionate about?</p>
            </div>
            <div className="space-y-6">
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 delay-100">
                <label className="block text-sm font-medium text-gray-700">
                  Favorite Subjects
                </label>
                <p className="text-sm text-gray-500 mb-3">Select all that apply</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['Mathematics', 'Science', 'English', 'History', 'Art', 'Music', 'Physical Education', 'Computer Science', 'Languages'].map((subject, index) => (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => toggleSubject(subject)}
                      style={{ animationDelay: `${index * 50}ms` }}
                      className={`px-4 py-3 rounded-xl border-2 transition-all transform hover:scale-105 active:scale-95 animate-in fade-in zoom-in duration-300 ${
                        formData.subjects.includes(subject)
                          ? 'bg-blue-100 border-blue-400 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
                      }`}
                    >
                      {subject}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 delay-200">
                <label htmlFor="hobbies" className="block text-sm font-medium text-gray-700">
                  Hobbies & Activities
                </label>
                <textarea
                  id="hobbies"
                  placeholder="Tell us about your hobbies, sports, or extracurricular activities..."
                  value={formData.hobbies}
                  onChange={(e) => updateFormData('hobbies', e.target.value)}
                  className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[100px] resize-none"
                />
              </div>
              
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 delay-300">
                <label htmlFor="goals" className="block text-sm font-medium text-gray-700">
                  Learning Goals
                </label>
                <textarea
                  id="goals"
                  placeholder="What do you hope to achieve this year? What are your dreams?"
                  value={formData.goals}
                  onChange={(e) => updateFormData('goals', e.target.value)}
                  className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[100px] resize-none"
                />
              </div>
            </div>
          </div>
        );
      
        case 5:
          return(
            <div 
            key="step4"
            className="space-y-6 animate-in fade-in slide-in-from-right-5 duration-300"
            >
              <div className="text-center mb-8">
                <div className="inline-block animate-in zoom-in duration-500 delay-200">
                  <IndianRupee className="w-16 h-16 mx-auto mb-4 text-blue-400" />
                </div>
                <h2 className="text-3xl font-bold text-blue-600 mb-2">Select Your Plan</h2>
                <p className="text-gray-600">Select Your Plan and Subscribe</p>
              </div>
              <div className="space-y-6">
                <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 delay-200">
                <label htmlFor="course" className="block text-sm font-medium text-gray-700">
                  Choose Course
                </label>
                <SelectComponent
                  id="course"
                  value={formData.course}
                  onChange={(value) => updateFormData('course', value)}
                  placeholder="Select Course"
                  options={[
                    { value: 'Moral Ethics - 48 Days - 4999 Rs', label: 'Moral Ethics - 48 Days - 4999 Rs' },
                    { value: 'NEET/JEE FOUNDATION - 10 Months - 1499 Rs / per month', label: 'NEET/JEE FOUNDATION - 10 Months - 1499 Rs / per month' },
                    {value: 'NEET/JEE 10 Months - 1999 Rs / per month', label: 'NEET/JEE 10 Months - 1999 Rs / per month' },
                    {value: 'NEET/JEE - Crash Course(For 12 Completed Students) - 10 Months - 1999 Rs / per month', label: 'NEET/JEE - Crash Course(For 12 Completed Students) - 10 Months - 1999 Rs / per month' },
                    
                  ]}
                />
              </div>
              </div>
            </div>
          )

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4 background">
      <div className="max-w-4xl mx-auto ">
        {/* Header */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-5 duration-500">
          <div className="inline-flex items-center gap-2 mb-4 animate-in zoom-in duration-500 delay-200">
            <h1 className="text-4xl font-bold text-blue-600 text-white">B2P STUDENT ONBOARDING</h1>
          </div>
          <p className="text-gray-600 text-white">Welcome! Let's create your learning profile</p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white py-[1rem] px-[1rem] rounded-lg mb-8 animate-in fade-in zoom-in-95 duration-500 delay-300">
          <div className="flex justify-between mb-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              
              return (
                <div
                  key={step.title}
                  style={{ animationDelay: `${400 + index * 100}ms` }}
                  className="flex flex-col items-center flex-1 animate-in fade-in slide-in-from-top-3 duration-500"
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all transform hover:scale-110 ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                        ? 'bg-blue-500 text-white ring-4 ring-blue-200'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <Icon className="w-6 h-6" />
                    )}
                  </div>
                  <span className={`text-xs text-center hidden md:block ${isCurrent ? 'font-semibold' : 'text-gray-500'}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg animate-in fade-in slide-in-from-bottom-5 duration-500 delay-500">
          <div className="p-8 shadow-2xl bg-white/80 backdrop-blur-sm border-2 border-white rounded-2xl">
            {renderStep()}

            {/* Navigation Buttons */}
            <div className="flex flex-col md:flex-row gap-[1rem] justify-between mt-8 pt-6 border-t animate-in fade-in duration-500 delay-600">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </button>

              {currentStep < steps.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all transform hover:scale-105 active:scale-95"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105 active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {
                    onLoad?
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 animate-spin">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    :
                    "Complete Registration"


                  }
                  
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="text-center mt-6 text-gray-500 text-sm animate-in fade-in duration-500 delay-700 text-white">
          Step {currentStep + 1} of {steps.length}
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleModalClose}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-300">
            <button
              onClick={handleModalClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mb-4 animate-in zoom-in duration-500 delay-200">
                <PartyPopper className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold mb-2 animate-in fade-in slide-in-from-bottom-3 duration-300 delay-300">
                Registration Successful! 🎉
              </h2>
              
              <p className="text-gray-600 mb-6 animate-in fade-in slide-in-from-bottom-3 duration-300 delay-400">
                Welcome to the platform! Here are your login credentials:
              </p>
            </div>

            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-300 delay-500">
              {/* Email Section */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <div className="flex gap-2">
                  <input
                    value={formData.email}
                    readOnly
                    className="flex-1 px-4 py-2 bg-blue-50 border-2 border-blue-200 rounded-lg focus:outline-none"
                  />
                  <button
                    onClick={handleCopyEmail}
                    className="shrink-0 w-10 h-10 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    {copiedEmail ? (
                      <Check className="w-4 h-4 text-green-600 animate-in zoom-in duration-200" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password Section */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                  <KeyRound className="w-4 h-4" />
                  Auto-Generated Password
                </label>
                <div className="flex gap-2">
                  <input
                    value={generatedPassword}
                    readOnly
                    type="text"
                    className="flex-1 px-4 py-2 bg-purple-50 border-2 border-purple-200 rounded-lg focus:outline-none font-mono"
                  />
                  <button
                    onClick={handleCopyPassword}
                    className="shrink-0 w-10 h-10 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    {copiedPassword ? (
                      <Check className="w-4 h-4 text-green-600 animate-in zoom-in duration-200" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="text-yellow-600">⚠️</span>
                  Please save this password securely. You can change it later in settings.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-4 animate-in fade-in slide-in-from-bottom-3 duration-300 delay-600">
                <button
                  onClick={handleModalClose}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 active:scale-95"
                >
                  Make Sure You Copy The Credentials for Accessing Our Portal
                </button>
                <p className="text-xs text-center text-gray-500">
                  A confirmation email has been sent to your inbox
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}