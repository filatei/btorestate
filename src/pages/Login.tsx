import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle, ArrowRight, Users, CreditCard, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      // Navigation is handled by the PublicRoute component
    } catch (error: any) {
      console.error('Sign-in error:', error);
      if (error.code === 'auth/popup-blocked') {
        toast.error('Please allow popups to sign in');
      } else if (error.code === 'auth/cancelled-popup-request') {
        // User closed the popup, no need to show error
        return;
      } else {
        toast.error('Failed to sign in. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: <Users className="h-6 w-6 text-indigo-600" />,
      title: "Community Management",
      description: "Efficiently manage residents, communications, and community events all in one place."
    },
    {
      icon: <CreditCard className="h-6 w-6 text-indigo-600" />,
      title: "Payment Processing",
      description: "Streamline service charge collections with integrated payment processing and tracking."
    },
    {
      icon: <Bell className="h-6 w-6 text-indigo-600" />,
      title: "Real-time Notifications",
      description: "Stay informed with instant updates on payments, maintenance requests, and community announcements."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <nav className="flex justify-between items-center mb-16">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-indigo-600" />
            <div className="ml-2">
              <span className="text-xl font-semibold text-gray-900">Torestate</span>
              <span className="ml-2 text-sm text-gray-500">Simplifying Estate Management</span>
            </div>
          </div>
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Sign In
          </button>
        </nav>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
              The Most Advanced Solution For Property Management
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Transform your estate management with our cutting-edge, unified software solution. Experience efficiency, ease, and excellence in every aspect of property management.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="px-8 py-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  <>
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </button>
              <button className="px-8 py-4 border border-indigo-600 text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition-colors">
                Learn More
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-100 rounded-3xl transform rotate-3"></div>
            <div className="relative bg-white p-6 rounded-3xl shadow-xl">
              <img
                src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80"
                alt="Modern building"
                className="w-full rounded-2xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything you need to manage your estate
            </h2>
            <p className="text-xl text-gray-600">
              Comprehensive tools designed to make estate management effortless
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-xl border border-gray-200 hover:border-indigo-500 transition-colors"
              >
                <div className="p-3 bg-indigo-50 rounded-lg inline-block mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trust Section */}
      <div className="bg-indigo-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center bg-indigo-100 px-4 py-2 rounded-full text-indigo-700 font-medium text-sm mb-8">
            <CheckCircle className="h-5 w-5 mr-2" />
            Trusted by leading property managers
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-8">
            Join thousands of satisfied estate managers
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience the future of estate management with our comprehensive platform. Streamline operations, enhance communication, and deliver exceptional service to your residents.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;