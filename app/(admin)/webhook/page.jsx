// // frontend/pages/webhooks/index.js
// 'use client';
// import { useState, useEffect } from 'react';
// import { getAuth } from 'firebase/auth'; // 🔐 Firebase auth

// export default function WebhooksHome() {
//     const [webhooks, setWebhooks] = useState([]);
//     const [adminId, setAdminId] = useState('');
//     const [error, setError] = useState('');
//     const [loading, setLoading] = useState(false);

//     // Fetch all webhooks for a particular admin (for demo, we pass admin_id via query param)
//     const fetchWebhooks = async () => {
//         try {
//             const auth = getAuth();
//             const user = auth.currentUser;

//             if (!user) {
//                 Swal.fire('Unauthorized', 'You must be logged in to submit this form.', 'error');
//                 return;
//             }

//             const token = await user.getIdToken(); // 🔑 Firebase token
//             setError('');
//             if (!adminId) return;
//             const res = await fetch(`http://localhost:5000/api/webhook/admin/all?admin_id=${adminId}`, {
//                 method: 'GET',
//                 headers: { 'Content-Type': 'application/json' , Authorization: `Bearer ${token}`},
//             });
//             if (!res.ok) throw new Error('Failed to fetch webhooks');
//             const data = await res.json();
//             setWebhooks(data);
//         } catch (err) {
//             setError(err.message);
//         }
//     };

//     const handleCreateWebhook = async () => {
//         if (!adminId) {
//             setError('Please enter admin_id before creating a webhook.');
//             return;
//         }
//         setLoading(true);
//         setError('');

//         try {
//             const auth = getAuth();
//             const user = auth.currentUser;

//             if (!user) {
//                 Swal.fire('Unauthorized', 'You must be logged in to submit this form.', 'error');
//                 return;
//             }

//             const token = await user.getIdToken(); // 🔑 Firebase token
//             const res = await fetch('http://localhost:5000/api/webhook', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' , Authorization: `Bearer ${token}`},
//                 body: JSON.stringify({ admin_id: adminId }),
//             });
//             if (!res.ok) throw new Error('Failed to create webhook');
//             const result = await res.json();
//             alert(`Webhook created: ${result.webhook.webhook_id}`);
//             // Re-fetch the list
//             await fetchWebhooks();
//         } catch (err) {
//             setError(err.message);
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <div style={{ padding: 20 }}>
//             <h1>Manage Webhooks</h1>
//             <label>Admin ID: </label>
//             <input type="text" value={adminId} onChange={(e) => setAdminId(e.target.value)} />
//             <button onClick={fetchWebhooks}>Fetch Webhooks</button>
//             <button onClick={handleCreateWebhook} disabled={loading}>
//                 Create Webhook
//             </button>

//             {error && <p style={{ color: 'red' }}>{error}</p>}

//             <h2>Your Webhooks</h2>
//             <ul>
//                 {webhooks.map((wh) => (
//                     <li key={wh.webhook_id}>
//                         <a href={`/webhook/${wh.webhook_id}`}>
//                             {wh.webhook_id} (token: {wh.webhook_secret})
//                         </a>
//                     </li>
//                 ))}
//             </ul>
//         </div>
//     );
// }

'use client';

import { useAuth } from '@/context/AuthContext';
import { redirect } from 'next/dist/server/api-utils';
import { useState } from 'react';
import { HiUser, HiMail, HiPhone, HiHome, HiCalendar, HiOutlineUserGroup, HiOutlineBriefcase, HiOutlineDocumentText, HiOutlineCurrencyDollar, HiOutlineClipboardCheck, HiOutlineTag, HiOutlineTrash, HiOutlineEye } from 'react-icons/hi'; // Added Trash and Eye icons


// Minimalist Inline SVG icons for embed code (using stroke for cleaner look)
const inlineIcons = {
  full_name: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
  email: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`,
  phone_number: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`,
  // Add other icons as needed, maintaining the minimalist style
};

export default function EnhancedFormBuilder() {
  const { user } = useAuth();

  const admin = user.admin_id;

  // Fixed Core Fields (cannot be edited) - Using inline SVGs now
  const coreFields = [  
    { label: "Full Name", name: "full_name", type: "text", required: true, icon: inlineIcons.full_name },
    { label: "Email", name: "email", type: "email", required: true, icon: inlineIcons.email },
    { label: "Phone Number", name: "phone_number", type: "text", required: true, icon: inlineIcons.phone_number },
  ];

  // Pre-made additional fields available (with react-icons for the builder UI)
  const availableAdditionalFields = [
    { label: "Address", name: "address", type: "text", icon: <HiHome className="w-5 h-5 text-gray-500" /> },
    { label: "Date of Birth", name: "date_of_birth", type: "date", icon: <HiCalendar className="w-5 h-5 text-gray-500" /> },
    { label: "Gender", name: "gender", type: "select", options: ["Male", "Female", "Other"], icon: <HiOutlineUserGroup className="w-5 h-5 text-gray-500" /> },
    { label: "Company Name", name: "company_name", type: "text", icon: <HiOutlineBriefcase className="w-5 h-5 text-gray-500" /> },
    { label: "Insurance Type", name: "insurance_type", type: "text", icon: <HiOutlineDocumentText className="w-5 h-5 text-gray-500" /> },
    { label: "Policy Number", name: "policy_number", type: "text", icon: <HiOutlineDocumentText className="w-5 h-5 text-gray-500" /> },
    { label: "Coverage Amount", name: "coverage_amount", type: "number", icon: <HiOutlineCurrencyDollar className="w-5 h-5 text-gray-500" /> },
    { label: "Preferred Plan", name: "preferred_plan", type: "text", icon: <HiOutlineClipboardCheck className="w-5 h-5 text-gray-500" /> },
    // { label: "Next Follow Up Date", name: "next_follow_up_date", type: "datetime-local", icon: <HiCalendar className="w-5 h-5 text-gray-500" /> },
    { label: "Referrer", name: "referrer", type: "text", icon: <HiUser className="w-5 h-5 text-gray-500" /> },
    { label: "Category", name: "category", type: "text", icon: <HiOutlineTag className="w-5 h-5 text-gray-500" /> },
  ];

  // Selected additional fields (picked by admin)
  const [selectedAdditionalFields, setSelectedAdditionalFields] = useState([]);

  // Simplified Styling options - focusing on key aspects for a cleaner look
  const [styles, setStyles] = useState({
    formBackgroundColor: '#ffffff', // White background
    textColor: '#333333', // Dark grey text
    labelStyle: 'bold', // Bold labels
    inputStyle: 'underline', // Underlined inputs
    inputBorderColor: '#cccccc', // Light grey border for underline/box
    buttonBackgroundColor: '#6366f1', // Indigo primary color
    buttonTextColor: '#ffffff', // White button text
    buttonStyle: 'filled', // Filled button
    roundedCorners: 'medium', // Medium rounded corners
    redirectURL: '',
  });

  // Custom button text (for the embed form)
  const [buttonText, setButtonText] = useState('Submit Information');

  // Handler: add an additional field (avoid duplicates)
  const addAdditionalField = (field) => {
    if (!selectedAdditionalFields.find((f) => f.name === field.name)) {
      setSelectedAdditionalFields([...selectedAdditionalFields, field]);
    }
  };

  // Handler: remove an additional field
  const removeAdditionalField = (fieldName) => {
    setSelectedAdditionalFields(selectedAdditionalFields.filter((f) => f.name !== fieldName));
  };

  // --- Embed Code Generator ---
  // Generates clean HTML with inline CSS reflecting the selected styles.
  const generateEmbedCode = () => {
    // Map for converting rounded corner options to pixel values.
    const borderRadiusMap = { none: '0px', small: '4px', medium: '8px', large: '16px' };
    // Set input padding based on a style option. (Make sure styles.inputStyle is defined.)
    const inputPadding = styles.inputStyle === 'box' ? '10px 12px' : '8px 2px';
    // Set input border style based on input style (box or underline).
    const inputBorderStyle = styles.inputStyle === 'underline'
      ? `border: none; border-bottom: 1px solid ${styles.inputBorderColor}; border-radius: 0;`
      : `border: 1px solid ${styles.inputBorderColor}; border-radius: ${borderRadiusMap[styles.roundedCorners]};`;
    
    const buttonPadding = '10px 20px';
    // Set button border style based on a style option (outline or solid).
    const buttonBorderStyle = styles.buttonStyle === 'outline'
      ? `border: 1px solid ${styles.buttonBackgroundColor}; background-color: transparent; color: ${styles.buttonBackgroundColor};`
      : `border: none; background-color: ${styles.buttonBackgroundColor}; color: ${styles.buttonTextColor};`;
    
    // Define unique element IDs to be used in the embed code.
    const formId = 'embedForm';
    const statusId = 'embedStatus';
    
    // Begin form HTML. Use a data attribute to store the redirect URL for later use.
    let code = `<form id="${formId}" action="https://sarthiapi.vercel.app/api/leads/embed" method="POST" data-redirect="${styles.redirectUrl || ''}" style="background-color: ${styles.formBackgroundColor}; padding: 25px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; border-radius: ${borderRadiusMap[styles.roundedCorners]}; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">\n`;
    
    code += `  <input type="hidden" name="admin_id" value="${admin || 'YOUR_ADMIN_ID'}" />\n`;
    
    // Function to generate HTML for a field (with inline styling)
    const generateFieldHTML = (field) => {
      let iconHTML = "";
      // If the field is one of the core fields and its icon is a string (inline SVG), include it.
      if (coreFields.some(cf => cf.name === field.name && typeof cf.icon === 'string')) {
        iconHTML = `<span style="margin-right: 8px; vertical-align: middle; display: inline-block; color: ${styles.textColor};">${field.icon}</span>`;
      }
    
      let fieldHTML = `  <div style="margin-bottom: 20px;">\n`;
      fieldHTML += `    <label style="display: block; color: ${styles.textColor}; margin-bottom: 8px; font-weight: ${styles.labelStyle === 'bold' ? '600' : 'normal'}; font-size: 14px;">${iconHTML}${field.label}${field.required ? '<span style="color: #e53e3e; margin-left: 4px;">*</span>' : ''}</label>\n`;
    
      if (field.type === "select" && field.options) {
        fieldHTML += `    <select name="${field.name}" ${field.required ? 'required' : ''} style="width: 100%; padding: ${inputPadding}; ${inputBorderStyle} background-color: ${styles.formBackgroundColor}; color: ${styles.textColor}; font-size: 15px; box-sizing: border-box;">\n`;
        fieldHTML += `      <option value="">Select...</option>\n`;
        field.options.forEach((opt) => {
          fieldHTML += `      <option value="${opt}">${opt}</option>\n`;
        });
        fieldHTML += `    </select>\n`;
      } else {
        fieldHTML += `    <input type="${field.type}" name="${field.name}" ${field.required ? 'required' : ''} style="width: 100%; padding: ${inputPadding}; ${inputBorderStyle} background-color: transparent; color: ${styles.textColor}; font-size: 15px; box-sizing: border-box;" />\n`;
      }
      fieldHTML += `  </div>\n`;
      return fieldHTML;
    };
    
    // Generate HTML for each core field.
    coreFields.forEach((field) => {
      code += generateFieldHTML(field);
    });
    
    // Generate HTML for each additional (selected) field.
    selectedAdditionalFields.forEach((field) => {
      // In embed code for additional fields, we don't include icons.
      const fieldForEmbed = { ...field, icon: undefined };
      code += generateFieldHTML(fieldForEmbed);
    });
    
    // Generate the Submit button (centered) with inline styling.
    code += `  <button type="submit" style="display: block; width: auto; margin: 25px auto 0; ${buttonBorderStyle} padding: ${buttonPadding}; border-radius: ${borderRadiusMap[styles.roundedCorners]}; cursor: pointer; font-size: 15px; font-weight: 600; text-align: center;">${buttonText}</button>\n`;
    code += `</form>\n`;
    
    // Add a status div to show messages (success/error).
    code += `<div id="${statusId}" style="text-align: center; font-size: 14px; margin-top: 10px;"></div>\n`;
    
    // Add JavaScript for AJAX submission.
    code += `<script>\n`;
    code += `(function() {\n`;
    code += `  var form = document.getElementById('${formId}');\n`;
    code += `  var statusDiv = document.getElementById('${statusId}');\n`;
    code += `  var submitButton = form.querySelector('button[type="submit"]');\n\n`;
    code += `  if (form && statusDiv && submitButton) {\n`;
    code += `    form.addEventListener('submit', function(event) {\n`;
    code += `      event.preventDefault();\n\n`;
    code += `      statusDiv.style.color = '#333';\n`;
    code += `      statusDiv.textContent = 'Submitting...';\n`;
    code += `      submitButton.disabled = true;\n\n`;
    code += `      var formData = new FormData(form);\n`;
    code += `      var data = Object.fromEntries(formData.entries());\n\n`;
    code += `      fetch(form.action, {\n`;
    code += `        method: form.method,\n`;
    code += `        headers: { "Content-Type": "application/json" },\n`;
    code += `        body: JSON.stringify(data)\n`;
    code += `      })\n`;
    code += `      .then(function(response) {\n`;
    code += `        if (!response.ok) {\n`;
    code += `          return response.json().then(function(errData) {\n`;
    code += `             throw new Error(errData.message || 'Submission failed. Status: ' + response.status);\n`;
    code += `          }).catch(function() {\n`;
    code += `            throw new Error('Submission failed. Status: ' + response.status);\n`;
    code += `          });\n`;
    code += `        }\n`;
    code += `        return response.json();\n`;
    code += `      })\n`;
    code += `      .then(function(data) {\n`;
    code += `        statusDiv.style.color = 'green';\n`;
    code += `        statusDiv.textContent = 'Success! Information received.';\n`;
    code += `        form.reset();\n`;
    code += `        var redirectUrl = form.getAttribute('data-redirect');\n`;
    code += `        if (redirectUrl) { window.location.href = redirectUrl; }\n`;
    code += `      })\n`;
    code += `      .catch(function(error) {\n`;
    code += `        statusDiv.style.color = 'red';\n`;
    code += `        statusDiv.textContent = 'Error: ' + error.message;\n`;
    code += `        submitButton.disabled = false;\n`;
    code += `        console.error('Error:', error);\n`;
    code += `      });\n`;
    code += `    });\n`;
    code += `  } else {\n`;
    code += `     console.error('Embed form elements not found. Form ID:', '${formId}');\n`;
    code += `  }\n`;
    code += `})();\n`;
    code += `</script>\n`;
    
    
    return code;
  };
  

  // --- Copy embed code to clipboard ---
  const copyEmbedCode = async () => {
    try {
      await navigator.clipboard.writeText(generateEmbedCode());
      // Use a more subtle notification, e.g., a temporary message or toast
      alert("Embed code copied!");
    } catch (err) {
      console.error("Failed to copy embed code:", err);
      alert("Failed to copy embed code.");
    }
  };

  // Helper to render input based on style choice for the builder UI
  const renderStyledInput = (type, value, onChange, placeholder = '') => {
    const baseClasses = "w-full text-sm";
    if (styles.inputStyle === 'underline') {
      return <input type={type} value={value} onChange={onChange} placeholder={placeholder} className={`${baseClasses} border-b border-gray-300 focus:border-indigo-500 outline-none py-1`} />;
    } else { // box style
      const radiusClass = { none: 'rounded-none', small: 'rounded', medium: 'rounded-md', large: 'rounded-lg' }[styles.roundedCorners];
      return <input type={type} value={value} onChange={onChange} placeholder={placeholder} className={`${baseClasses} border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none px-3 py-2 ${radiusClass}`} />;
    }
  };

  // Helper to render select based on style choice
  const renderStyledSelect = (value, onChange, options) => {
    const baseClasses = "w-full text-sm";
     if (styles.inputStyle === 'underline') {
       return (
         <select value={value} onChange={onChange} className={`${baseClasses} border-b border-gray-300 focus:border-indigo-500 outline-none py-1 bg-transparent`}>
           {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
         </select>
       );
     } else { // box style
       const radiusClass = { none: 'rounded-none', small: 'rounded', medium: 'rounded-md', large: 'rounded-lg' }[styles.roundedCorners];
       return (
         <select value={value} onChange={onChange} className={`${baseClasses} border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none px-3 py-2 ${radiusClass} bg-white`}>
           {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
         </select>
       );
     }
  };


  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Premium Form Builder</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-screen-xl mx-auto">

        {/* Left Column: Available Fields & Selected Fields */}
        <div className="lg:col-span-1 space-y-6">
           {/* Available Additional Fields */}
           <div className="p-5 border rounded-lg bg-white shadow-sm">
             <h2 className="text-xl font-semibold mb-4 text-gray-700">Available Fields</h2>
             <p className="text-sm text-gray-500 mb-4">Click to add to your form:</p>
             <div className="grid grid-cols-2 gap-3">
               {availableAdditionalFields
                 .filter(availField => !selectedAdditionalFields.some(selField => selField.name === availField.name)) // Filter out already selected fields
                 .map((field, idx) => (
                   <button
                     key={idx}
                     onClick={() => addAdditionalField(field)}
                     className="flex items-center gap-2 p-2 border rounded-md hover:bg-indigo-50 hover:border-indigo-300 transition duration-150 ease-in-out text-sm text-gray-600"
                     title={`Add ${field.label}`}
                   >
                     {field.icon}
                     <span>{field.label}</span>
                   </button>
                 ))}
                 {availableAdditionalFields.length === selectedAdditionalFields.length && (
                    <p className="col-span-2 text-sm text-gray-400 text-center mt-2">All available fields added.</p>
                 )}
             </div>
           </div>

           {/* Selected Fields */}
           <div className="p-5 border rounded-lg bg-white shadow-sm">
             <h2 className="text-xl font-semibold mb-4 text-gray-700">Your Form Fields</h2>
             {/* Core Fields Display (non-removable) */}
             <h3 className="text-sm font-medium text-gray-500 mb-2 mt-4 uppercase">Core Fields</h3>
             <ul className="space-y-2 mb-4">
               {coreFields.map((field, idx) => (
                 <li key={`core-${idx}`} className="flex items-center justify-between gap-3 p-2 bg-gray-50 rounded border border-gray-200">
                   <div className="flex items-center gap-2">
                     <span className="text-gray-500" dangerouslySetInnerHTML={{ __html: field.icon || '' }} />
                     <span className="text-sm font-medium text-gray-700">{field.label}</span>
                     {field.required && <span className="text-red-500 text-xs">(Required)</span>}
                   </div>
                 </li>
               ))}
             </ul>

             {/* Selected Additional Fields (removable) */}
             {selectedAdditionalFields.length > 0 && (
                <>
                 <h3 className="text-sm font-medium text-gray-500 mb-2 mt-5 uppercase">Additional Fields</h3>
                 <ul className="space-y-2">
                   {selectedAdditionalFields.map((field, idx) => (
                     <li key={`add-${idx}`} className="flex items-center justify-between gap-3 p-2 bg-white rounded border border-gray-200 group">
                       <div className="flex items-center gap-2">
                         <span className="text-gray-500">{field.icon}</span>
                         <span className="text-sm text-gray-700">{field.label}</span>
                       </div>
                       <button
                         onClick={() => removeAdditionalField(field.name)}
                         className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                         title={`Remove ${field.label}`}
                       >
                         <HiOutlineTrash className="w-4 h-4" />
                       </button>
                     </li>
                   ))}
                 </ul>
                </>
             )}
             {selectedAdditionalFields.length === 0 && coreFields.length > 0 && (
                <p className="text-sm text-gray-400 text-center mt-4">Add fields from the 'Available Fields' section.</p>
             )}
           </div>
        </div>


        {/* Middle Column: Settings & Styling */}
        <div className="lg:col-span-1 space-y-6">
          {/* Styling Options */}
          <div className="p-5 border rounded-lg bg-white shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Form Styles</h2>
            <div className="space-y-4">
              {/* Input Style */}
              <div>
                 <label className="block text-sm font-medium mb-1 text-gray-600">Input Style</label>
                 <div className="flex gap-2">
                   {['underline', 'box'].map(style => (
                     <button key={style} onClick={() => setStyles({ ...styles, inputStyle: style })} className={`px-3 py-1 border rounded-md text-sm capitalize ${styles.inputStyle === style ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'border-gray-300 text-gray-500 hover:bg-gray-50'}`}>
                       {style}
                     </button>
                   ))}
                 </div>
               </div>

              {/* Button Style */}
              <div>
                 <label className="block text-sm font-medium mb-1 text-gray-600">Button Style</label>
                 <div className="flex gap-2">
                   {['filled', 'outline'].map(style => (
                     <button key={style} onClick={() => setStyles({ ...styles, buttonStyle: style })} className={`px-3 py-1 border rounded-md text-sm capitalize ${styles.buttonStyle === style ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'border-gray-300 text-gray-500 hover:bg-gray-50'}`}>
                       {style}
                     </button>
                   ))}
                 </div>
               </div>

               {/* Rounded Corners */}
               <div>
                 <label className="block text-sm font-medium mb-1 text-gray-600">Rounded Corners</label>
                 <div className="flex gap-2">
                   {['none', 'small', 'medium', 'large'].map(radius => (
                     <button key={radius} onClick={() => setStyles({ ...styles, roundedCorners: radius })} className={`px-3 py-1 border rounded-md text-sm capitalize ${styles.roundedCorners === radius ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'border-gray-300 text-gray-500 hover:bg-gray-50'}`}>
                       {radius}
                     </button>
                   ))}
                 </div>
               </div> 

              {/* Colors */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                 <div>
                   <label className="block text-xs font-medium mb-1 text-gray-500">Form Background</label>
                   <input type="color" value={styles.formBackgroundColor} onChange={(e) => setStyles({ ...styles, formBackgroundColor: e.target.value })} className="w-full h-8 border border-gray-300 rounded cursor-pointer" />
                 </div>
                 <div>
                   <label className="block text-xs font-medium mb-1 text-gray-500">Text Color</label>
                   <input type="color" value={styles.textColor} onChange={(e) => setStyles({ ...styles, textColor: e.target.value })} className="w-full h-8 border border-gray-300 rounded cursor-pointer" />
                 </div>
                 <div>
                   <label className="block text-xs font-medium mb-1 text-gray-500">Button Background</label>
                   <input type="color" value={styles.buttonBackgroundColor} onChange={(e) => setStyles({ ...styles, buttonBackgroundColor: e.target.value })} className="w-full h-8 border border-gray-300 rounded cursor-pointer" />
                 </div>
                 <div>
                   <label className="block text-xs font-medium mb-1 text-gray-500">Button Text</label>
                   <input type="color" value={styles.buttonTextColor} onChange={(e) => setStyles({ ...styles, buttonTextColor: e.target.value })} className="w-full h-8 border border-gray-300 rounded cursor-pointer" />
                 </div>
                 {styles.inputStyle !== 'underline' && ( // Only show border color if not underline
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-500">Input Border</label>
                      <input type="color" value={styles.inputBorderColor} onChange={(e) => setStyles({ ...styles, inputBorderColor: e.target.value })} className="w-full h-8 border border-gray-300 rounded cursor-pointer" />
                    </div>
                 )}
              </div>
            </div>
          </div>

          {/* Button Text Customization */}
          <div className="p-5 border rounded-lg bg-white shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Button Settings</h2>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-600">Button Text</label>
              {renderStyledInput('text', buttonText, (e) => setButtonText(e.target.value))}
              <p className="text-xs text-gray-500 mt-1">This text appears on the form's submit button.</p>
            </div>
          </div>

          {/* redirect url settings */}
          <div className="p-5 border rounded-lg bg-white shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Redirect URL</h2>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-600">Redirect URL</label>
              {renderStyledInput('text', styles.redirectUrl, (e) => setStyles({ ...styles, redirectUrl: e.target.value }))}
              <p className="text-xs text-gray-500 mt-1">This is the URL that the form will redirect to after submission.</p>
            </div>
          </div>

          {/* Embed Code Section */}
          <div className="p-5 border rounded-lg bg-white shadow-sm">
             <h2 className="text-xl font-semibold mb-4 text-gray-700">Embed Code</h2>
             <p className="text-sm text-gray-500 mb-3">Copy and paste this code into your website HTML where you want the form to appear.</p>
             <textarea
               readOnly
               value={generateEmbedCode()}
               className="w-full h-40 p-3 border border-gray-300 rounded-md font-mono text-xs bg-gray-50 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
             />
             <button
               onClick={copyEmbedCode}
               className="mt-3 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
             >
               Copy Embed Code
             </button>
           </div>
        </div>


        {/* Right Column: Live Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-8"> {/* Make preview sticky */}
            <h2 className="text-xl font-semibold mb-4 text-center text-gray-700">Live Preview</h2>
            <div className="bg-gray-100 p-4 rounded-lg border border-gray-200 shadow-inner">
              {/* Render the form using the generated embed code's logic for consistency */}
              <div dangerouslySetInnerHTML={{ __html: generateEmbedCode().replace('<form action="https://yourdomain.com/api/leads/embed"','<form action="#"') }} />
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">This is how your form will look when embedded.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
