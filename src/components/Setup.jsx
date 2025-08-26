import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';

const Setup = () => {
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');

  const createAdminUser = async () => {
    setStatus('loading');
    setMessage('Creating admin user...');

    try {
      const response = await fetch('/.netlify/functions/setup-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.error || 'Error creating admin user');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Byght Portal Setup
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create the admin user for the portal
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {status === 'idle' && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Click the button below to create the admin user.
                  This step is only required once.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Admin Credentials
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p><strong>Username:</strong> admin</p>
                        <p><strong>Password:</strong> admin123</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={createAdminUser}
                className="w-full flex justify-center py-3 px-6 border border-transparent rounded-xl shadow-md text-sm font-medium text-white bg-[#5E5D61] hover:bg-[#4E4D51] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5E5D61]/40 transition-all duration-200 hover:shadow-lg transform hover:scale-105"
              >
                Create Admin User
              </button>
            </div>
          )}

          {status === 'loading' && (
            <div className="text-center">
              <Loader className="mx-auto h-8 w-8 text-blue-600 animate-spin" />
              <p className="mt-2 text-sm text-gray-600">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <CheckCircle className="mx-auto h-8 w-8 text-green-600" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Success!</h3>
              <p className="mt-1 text-sm text-gray-600">{message}</p>
              <div className="mt-6">
                <a
                  href="/"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-[#5E5D61] hover:bg-[#4E4D51] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5E5D61]/40 transition-all duration-200 hover:shadow-lg transform hover:scale-105"
                >
                  Go to Login
                </a>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
              <p className="mt-1 text-sm text-gray-600">{message}</p>
              <div className="mt-6">
                <button
                  onClick={() => {
                    setStatus('idle');
                    setMessage('');
                  }}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-[#5E5D61] hover:bg-[#4E4D51] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5E5D61]/40 transition-all duration-200 hover:shadow-lg transform hover:scale-105"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            ⚠️ Keep this setup URL safe in case you need it later
          </p>
        </div>
      </div>
    </div>
  );
};

export default Setup;
