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
// import { redirect } from 'next/dist/server/api-utils'; // Not used, can be removed
import { useState } from 'react';
import { 
    HiUser, 
    HiMail, 
    HiPhone, 
    HiHome, 
    HiCalendar, 
    HiOutlineUserGroup, 
    HiOutlineBriefcase, 
    HiOutlineDocumentText, 
    HiOutlineCurrencyDollar, 
    HiOutlineClipboardCheck, 
    HiOutlineTag, 
    HiOutlineTrash, 
    HiOutlineEye,
    HiOutlinePencilAlt, // Added for custom fields
    HiOutlineMenu // Potentially for custom select fields
} from 'react-icons/hi';


// Minimalist Inline SVG icons for embed code (using stroke for cleaner look)
const inlineIcons = {
  full_name: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
  email: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`,
  phone_number: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`,
};

export default function EnhancedFormBuilder() {
  const { user } = useAuth();
  const admin_id = user?.admin_id; // Use optional chaining and consistent naming

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
    { label: "Referrer", name: "referrer", type: "text", icon: <HiUser className="w-5 h-5 text-gray-500" /> },
    { label: "Category", name: "category", type: "text", icon: <HiOutlineTag className="w-5 h-5 text-gray-500" /> },
  ];

  // Selected additional fields (picked by admin) - can now include custom fields
  const [selectedAdditionalFields, setSelectedAdditionalFields] = useState([]);

  // Styling options
  const [styles, setStyles] = useState({
    formBackgroundColor: '#ffffff',
    textColor: '#333333',
    labelStyle: 'bold',
    inputStyle: 'underline',
    inputBorderColor: '#cccccc',
    buttonBackgroundColor: '#6366f1',
    buttonTextColor: '#ffffff',
    buttonStyle: 'filled',
    roundedCorners: 'medium',
    redirectUrl: '', // Renamed from redirectURL for consistency
  });

  // Custom button text
  const [buttonText, setButtonText] = useState('Submit Information');

  // NEW STATE for creating a custom field
  const [customFieldLabel, setCustomFieldLabel] = useState('');
  const [customFieldType, setCustomFieldType] = useState('text');
  const [customFieldOptions, setCustomFieldOptions] = useState(''); // Comma-separated
  const [customFieldRequired, setCustomFieldRequired] = useState(false);


  // --- Handlers ---

  // Handler: add an available additional field (avoid duplicates)
  const addAdditionalField = (field) => {
    if (!selectedAdditionalFields.find((f) => f.name === field.name)) {
      setSelectedAdditionalFields([...selectedAdditionalFields, { ...field, isCustom: false }]); // Mark as not custom
    }
  };

  // Handler: remove an additional field (pre-made or custom)
  const removeAdditionalField = (fieldName) => {
    setSelectedAdditionalFields(selectedAdditionalFields.filter((f) => f.name !== fieldName));
  };

  // NEW HANDLER: Add a custom designed field
  const addCustomDesignedField = () => {
    if (!customFieldLabel.trim()) {
      alert("Custom field label cannot be empty.");
      return;
    }

    // Generate a field name from the label: lowercase, underscores for spaces, remove special chars
    const fieldName = customFieldLabel.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/gi, '');
    if (!fieldName) {
       alert("Could not generate a valid field name from the label. Please use alphanumeric characters.");
       return;
    }

    // Check for name conflicts with core fields or already selected/custom fields
    if (coreFields.find(f => f.name === fieldName) || selectedAdditionalFields.find(f => f.name === fieldName)) {
      alert("A field with this name (derived from label) already exists. Please choose a different label.");
      return;
    }

    let fieldIcon = <HiOutlinePencilAlt className="w-5 h-5 text-gray-500" />; // Default for text
    if (customFieldType === 'select') fieldIcon = <HiOutlineMenu className="w-5 h-5 text-gray-500" />;
    else if (customFieldType === 'date') fieldIcon = <HiCalendar className="w-5 h-5 text-gray-500" />;
    else if (customFieldType === 'number') fieldIcon = <HiOutlineCurrencyDollar className="w-5 h-5 text-gray-500" />;
    else if (customFieldType === 'textarea') fieldIcon = <HiOutlineDocumentText className="w-5 h-5 text-gray-500" />;


    const newCustomField = {
      label: customFieldLabel.trim(),
      name: fieldName,
      type: customFieldType,
      required: customFieldRequired,
      isCustom: true, // Flag to identify custom fields
      icon: fieldIcon // Assign appropriate icon
    };

    if (customFieldType === 'select') {
      if (!customFieldOptions.trim()) {
        alert("Please provide options for the select field (comma-separated).");
        return;
      }
      newCustomField.options = customFieldOptions.split(',').map(opt => opt.trim()).filter(opt => opt);
      if (newCustomField.options.length === 0) {
       alert("Please provide valid, non-empty options for the select field.");
       return;
      }
    }
    
    setSelectedAdditionalFields([...selectedAdditionalFields, newCustomField]);

    // Reset custom field form
    setCustomFieldLabel('');
    setCustomFieldType('text');
    setCustomFieldOptions('');
    setCustomFieldRequired(false);
  };


  // --- Embed Code Generator ---
  const generateEmbedCode = () => {
    const borderRadiusMap = { none: '0px', small: '4px', medium: '8px', large: '16px' };
    const inputPadding = styles.inputStyle === 'box' ? '10px 12px' : '8px 2px';
    const inputBorderStyle = styles.inputStyle === 'underline'
      ? `border: none; border-bottom: 1px solid ${styles.inputBorderColor}; border-radius: 0;`
      : `border: 1px solid ${styles.inputBorderColor}; border-radius: ${borderRadiusMap[styles.roundedCorners]};`;
    
    const buttonPadding = '10px 20px';
    const buttonBorderStyle = styles.buttonStyle === 'outline'
      ? `border: 1px solid ${styles.buttonBackgroundColor}; background-color: transparent; color: ${styles.buttonBackgroundColor};`
      : `border: none; background-color: ${styles.buttonBackgroundColor}; color: ${styles.buttonTextColor};`;
    
    const formId = 'sarthiEmbedForm'; // Unique ID
    const statusId = 'sarthiEmbedStatus'; // Unique ID
    
    let code = `<form id="${formId}" action="https://sarthiapi.vercel.app/api/leads/embed" method="POST" data-redirect="${styles.redirectUrl || ''}" style="background-color: ${styles.formBackgroundColor}; padding: 25px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; border-radius: ${borderRadiusMap[styles.roundedCorners]}; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">\n`;
    
    code += `  <input type="hidden" name="admin_id" value="${admin_id || 'YOUR_ADMIN_ID_FALLBACK'}" />\n`; // Use admin_id
    
    const generateFieldHTML = (field) => {
      let iconHTML = "";
      // Only show inline SVG for non-custom core fields
      if (coreFields.some(cf => cf.name === field.name && typeof cf.icon === 'string') && !field.isCustom) {
        iconHTML = `<span style="margin-right: 8px; vertical-align: middle; display: inline-block; color: ${styles.textColor};">${field.icon}</span>`;
      }
    
      let fieldHTML = `  <div style="margin-bottom: 20px;">\n`;
      fieldHTML += `    <label style="display: block; color: ${styles.textColor}; margin-bottom: 8px; font-weight: ${styles.labelStyle === 'bold' ? '600' : 'normal'}; font-size: 14px;">${iconHTML}${field.label}${field.required ? '<span style="color: #e53e3e; margin-left: 4px;">*</span>' : ''}</label>\n`;
    
      if (field.type === "select" && field.options && field.options.length > 0) {
        fieldHTML += `    <select name="${field.name}" ${field.required ? 'required' : ''} style="width: 100%; padding: ${inputPadding}; ${inputBorderStyle} background-color: ${styles.formBackgroundColor}; color: ${styles.textColor}; font-size: 15px; box-sizing: border-box;">\n`;
        fieldHTML += `      <option value="">Select ${field.label}...</option>\n`;
        field.options.forEach((opt) => {
          fieldHTML += `      <option value="${opt}">${opt}</option>\n`;
        });
        fieldHTML += `    </select>\n`;
      } else if (field.type === "textarea") {
        fieldHTML += `    <textarea name="${field.name}" ${field.required ? 'required' : ''} style="width: 100%; padding: ${inputPadding}; ${inputBorderStyle} background-color: transparent; color: ${styles.textColor}; font-size: 15px; box-sizing: border-box; min-height: 80px; resize: vertical;"></textarea>\n`;
      } else {
        // Handle common input types explicitly for clarity and potential specific attributes in future
        let inputTypeAttribute = 'text'; // Default
        if (['email', 'number', 'date', 'datetime-local', 'tel', 'url'].includes(field.type)) {
            inputTypeAttribute = field.type;
        }
        fieldHTML += `    <input type="${inputTypeAttribute}" name="${field.name}" ${field.required ? 'required' : ''} style="width: 100%; padding: ${inputPadding}; ${inputBorderStyle} background-color: transparent; color: ${styles.textColor}; font-size: 15px; box-sizing: border-box;" />\n`;
      }
      fieldHTML += `  </div>\n`;
      return fieldHTML;
    };
    
    coreFields.forEach((field) => {
      code += generateFieldHTML(field);
    });
    
    selectedAdditionalFields.forEach((field) => {
      // For embed code, React component icons are not used directly.
      const fieldForEmbed = { ...field, icon: undefined }; 
      code += generateFieldHTML(fieldForEmbed);
    });
    
    code += `  <div style="text-align: center;">\n`; // Centering the button
    code += `    <button type="submit" style="display: inline-block; width: auto; margin-top: 10px; ${buttonBorderStyle} padding: ${buttonPadding}; border-radius: ${borderRadiusMap[styles.roundedCorners]}; cursor: pointer; font-size: 15px; font-weight: 600;">${buttonText}</button>\n`;
    code += `  </div>\n`;
    code += `</form>\n`;
    
    code += `<div id="${statusId}" style="text-align: center; font-size: 14px; margin-top: 15px; padding: 5px;"></div>\n`;
    
    code += `<script>\n`;
    code += `(function() {\n`;
    code += `  var form = document.getElementById('${formId}');\n`;
    code += `  var statusDiv = document.getElementById('${statusId}');\n`;
    code += `  var submitButton = form.querySelector('button[type="submit"]');\n\n`;
    code += `  if (form && statusDiv && submitButton) {\n`;
    code += `    form.addEventListener('submit', function(event) {\n`;
    code += `      event.preventDefault();\n\n`;
    code += `      statusDiv.style.color = '${styles.textColor}';\n`; // Use styled text color
    code += `      statusDiv.textContent = 'Submitting...';\n`;
    code += `      submitButton.disabled = true;\n\n`;
    code += `      var formData = new FormData(form);\n`;
    code += `      var data = {};\n`;
    code += `      formData.forEach(function(value, key){ data[key] = value; });\n\n`; // Convert FormData to plain object
    code += `      fetch(form.action, {\n`;
    code += `        method: form.method,\n`;
    code += `        headers: { 'Content-Type': 'application/json' },\n`; // Ensure server expects JSON
    code += `        body: JSON.stringify(data)\n`;
    code += `      })\n`;
    code += `      .then(function(response) {\n`;
    code += `        if (!response.ok) {\n`;
    code += `          return response.json().then(function(errData) {\n`; // Try to parse error JSON
    code += `             throw new Error(errData.message || 'Submission failed. Status: ' + response.status);\n`;
    code += `          }).catch(function() { /* If errData parsing fails */ \n`;
    code += `            throw new Error('Submission failed. Status: ' + response.status);\n`;
    code += `          });\n`;
    code += `        }\n`;
    code += `        return response.json();\n`;
    code += `      })\n`;
    code += `      .then(function(data) {\n`;
    code += `        statusDiv.style.color = 'green';\n`;
    code += `        statusDiv.textContent = data.message || 'Success! Information received.';\n`; // Use message from server if available
    code += `        form.reset();\n`;
    code += `        submitButton.disabled = false;\n`; // Re-enable button
    code += `        var redirectUrl = form.getAttribute('data-redirect');\n`;
    code += `        if (redirectUrl && redirectUrl.trim() !== '' && (redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://'))) {\n`;
    code += `          setTimeout(function() { window.location.href = redirectUrl; }, 1500);\n`; // Slight delay for user to see message
    code += `        }\n`;
    code += `      })\n`;
    code += `      .catch(function(error) {\n`;
    code += `        statusDiv.style.color = 'red';\n`;
    code += `        statusDiv.textContent = 'Error: ' + error.message;\n`;
    code += `        submitButton.disabled = false;\n`;
    code += `        console.error('Sarthi Embed Form Error:', error);\n`;
    code += `      });\n`;
    code += `    });\n`;
    code += `  } else {\n`;
    code += `     console.error('Sarthi Embed Form elements not found. Form ID:', '${formId}', 'Status ID:', '${statusId}');\n`;
    code += `  }\n`;
    code += `})();\n`;
    code += `</script>\n`;
        
    return code;
  };

  // --- Copy embed code to clipboard ---
  const copyEmbedCode = async () => {
    try {
      await navigator.clipboard.writeText(generateEmbedCode());
      alert("Embed code copied!"); // Simple alert, consider a toast notification
    } catch (err) {
      console.error("Failed to copy embed code:", err);
      alert("Failed to copy embed code. Please try again or copy manually.");
    }
  };

  // Helper to render input based on style choice for the builder UI
  const renderStyledInput = (type, value, onChange, placeholder = '', required = false) => {
    const baseClasses = "w-full text-sm bg-transparent"; // Ensure bg-transparent for underline
    if (styles.inputStyle === 'underline') {
      return <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} className={`${baseClasses} border-b border-gray-300 focus:border-indigo-500 outline-none py-1.5 px-0.5`} />;
    } else { // box style
      const radiusClass = { none: 'rounded-none', small: 'rounded', medium: 'rounded-md', large: 'rounded-lg' }[styles.roundedCorners];
      return <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} className={`${baseClasses} border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none px-3 py-2 ${radiusClass} bg-white`} />;
    }
  };

  // Helper to render select based on style choice
  const renderStyledSelect = (value, onChange, options, required = false) => {
    const baseClasses = "w-full text-sm";
     if (styles.inputStyle === 'underline') {
       return (
         <select value={value} onChange={onChange} required={required} className={`${baseClasses} border-b border-gray-300 focus:border-indigo-500 outline-none py-1.5 px-0.5 bg-transparent`}>
           <option value="">Select...</option>
           {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
         </select>
       );
     } else { // box style
       const radiusClass = { none: 'rounded-none', small: 'rounded', medium: 'rounded-md', large: 'rounded-lg' }[styles.roundedCorners];
       return (
         <select value={value} onChange={onChange} required={required} className={`${baseClasses} border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none px-3 py-2 ${radiusClass} bg-white`}>
           <option value="">Select...</option>
           {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
         </select>
       );
     }
  };


  return (
    <div className="p-4 md:p-8 bg-gray-100 dark:bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800 dark:text-gray-100">Premium Form Builder</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-screen-xl mx-auto">

        {/* Left Column: Available Fields, Custom Fields & Selected Fields */}
        <div className="lg:col-span-1 space-y-6">
           {/* Available Additional Fields */}
           <div className="p-5 border rounded-lg bg-white dark:bg-gray-800 shadow-sm">
             <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Available Pre-made Fields</h2>
             <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Click to add to your form:</p>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               {availableAdditionalFields
                 .filter(availField => !selectedAdditionalFields.some(selField => selField.name === availField.name)) 
                 .map((field, idx) => (
                   <button
                     key={idx}
                     onClick={() => addAdditionalField(field)}
                     className="flex items-center gap-2 p-2.5 border rounded-md hover:bg-indigo-50 dark:hover:bg-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition duration-150 ease-in-out text-sm text-gray-600 dark:text-gray-300 dark:border-gray-600"
                     title={`Add ${field.label}`}
                   >
                     {field.icon}
                     <span>{field.label}</span>
                   </button>
                 ))}
                 {availableAdditionalFields.filter(availField => !selectedAdditionalFields.some(selField => selField.name === availField.name)).length === 0 && (
                    <p className="col-span-1 sm:col-span-2 text-sm text-gray-400 dark:text-gray-500 text-center mt-2">All pre-made fields added.</p>
                 )}
             </div>
           </div>

            {/* Create Custom Field Section */}
            <div className="p-5 border rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Add Custom Field</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">Field Label / Question</label>
                        {renderStyledInput('text', customFieldLabel, (e) => setCustomFieldLabel(e.target.value), "e.g., What is your budget?", true)}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">Field Type</label>
                        {renderStyledSelect(customFieldType, (e) => setCustomFieldType(e.target.value), ['text', 'textarea', 'number', 'date', 'select', 'email', 'tel', 'url'])}
                    </div>
                    {customFieldType === 'select' && (
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">Options (comma-separated)</label>
                            {renderStyledInput('text', customFieldOptions, (e) => setCustomFieldOptions(e.target.value), "e.g., Option 1, Option 2", true)}
                        </div>
                    )}
                    <div className="flex items-center pt-1">
                        <input
                            id="customFieldRequired"
                            type="checkbox"
                            checked={customFieldRequired}
                            onChange={(e) => setCustomFieldRequired(e.target.checked)}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="customFieldRequired" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                            Required field?
                        </label>
                    </div>
                    <button
                        onClick={addCustomDesignedField}
                        className="w-full mt-2 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition"
                    >
                        Add Custom Field to Form
                    </button>
                </div>
            </div>

           {/* Selected Fields */}
           <div className="p-5 border rounded-lg bg-white dark:bg-gray-800 shadow-sm">
             <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Your Form Fields</h2>
             <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 mt-4 uppercase">Core Fields</h3>
             <ul className="space-y-2 mb-4">
               {coreFields.map((field, idx) => (
                 <li key={`core-${idx}`} className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                   <div className="flex items-center gap-2">
                     <span className="text-gray-500 dark:text-gray-400" dangerouslySetInnerHTML={{ __html: field.icon || '' }} />
                     <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{field.label}</span>
                     {field.required && <span className="text-red-500 text-xs ml-1">(Required)</span>}
                   </div>
                 </li>
               ))}
             </ul>

             {selectedAdditionalFields.length > 0 && (
                <>
                 <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 mt-5 uppercase">Additional & Custom Fields</h3>
                 <ul className="space-y-2">
                   {selectedAdditionalFields.map((field, idx) => (
                     <li key={`add-${idx}`} className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-gray-750 rounded border border-gray-200 dark:border-gray-600 group">
                       <div className="flex items-center gap-2">
                         {field.icon && <span className="text-gray-500 dark:text-gray-400">{field.icon}</span>}
                         <span className="text-sm text-gray-700 dark:text-gray-200">{field.label}</span>
                         {field.isCustom && <span className="ml-2 text-xs text-indigo-500 bg-indigo-100 dark:bg-indigo-900 dark:text-indigo-300 px-1.5 py-0.5 rounded-full">Custom</span>}
                         {field.required && !coreFields.find(cf => cf.name === field.name) && <span className="text-red-500 text-xs ml-1">(Required)</span>}
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
             {selectedAdditionalFields.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center mt-4">Add pre-made or custom fields to your form.</p>
             )}
           </div>
        </div>


        {/* Middle Column: Settings & Styling */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-5 border rounded-lg bg-white dark:bg-gray-800 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Form Styles</h2>
            <div className="space-y-5">
              <div>
                 <label className="block text-sm font-medium mb-1.5 text-gray-600 dark:text-gray-300">Input Style</label>
                 <div className="flex gap-2">
                   {['underline', 'box'].map(style => (
                     <button key={style} onClick={() => setStyles({ ...styles, inputStyle: style })} className={`px-3 py-1.5 border rounded-md text-sm capitalize ${styles.inputStyle === style ? 'bg-indigo-100 border-indigo-400 text-indigo-700 dark:bg-indigo-700 dark:border-indigo-500 dark:text-white' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                       {style}
                     </button>
                   ))}
                 </div>
               </div>

              <div>
                 <label className="block text-sm font-medium mb-1.5 text-gray-600 dark:text-gray-300">Button Style</label>
                 <div className="flex gap-2">
                   {['filled', 'outline'].map(style => (
                     <button key={style} onClick={() => setStyles({ ...styles, buttonStyle: style })} className={`px-3 py-1.5 border rounded-md text-sm capitalize ${styles.buttonStyle === style ? 'bg-indigo-100 border-indigo-400 text-indigo-700 dark:bg-indigo-700 dark:border-indigo-500 dark:text-white' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                       {style}
                     </button>
                   ))}
                 </div>
               </div>

               <div>
                 <label className="block text-sm font-medium mb-1.5 text-gray-600 dark:text-gray-300">Rounded Corners (Form & Inputs)</label>
                 <div className="flex gap-2">
                   {['none', 'small', 'medium', 'large'].map(radius => (
                     <button key={radius} onClick={() => setStyles({ ...styles, roundedCorners: radius })} className={`px-3 py-1.5 border rounded-md text-sm capitalize ${styles.roundedCorners === radius ? 'bg-indigo-100 border-indigo-400 text-indigo-700 dark:bg-indigo-700 dark:border-indigo-500 dark:text-white' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                       {radius}
                     </button>
                   ))}
                 </div>
               </div> 

              <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-2">
                 <div>
                   <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">Form Background</label>
                   <input type="color" value={styles.formBackgroundColor} onChange={(e) => setStyles({ ...styles, formBackgroundColor: e.target.value })} className="w-full h-9 border border-gray-300 dark:border-gray-600 rounded cursor-pointer p-0.5" />
                 </div>
                 <div>
                   <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">Text Color</label>
                   <input type="color" value={styles.textColor} onChange={(e) => setStyles({ ...styles, textColor: e.target.value })} className="w-full h-9 border border-gray-300 dark:border-gray-600 rounded cursor-pointer p-0.5" />
                 </div>
                 <div>
                   <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">Button Background</label>
                   <input type="color" value={styles.buttonBackgroundColor} onChange={(e) => setStyles({ ...styles, buttonBackgroundColor: e.target.value })} className="w-full h-9 border border-gray-300 dark:border-gray-600 rounded cursor-pointer p-0.5" />
                 </div>
                 <div>
                   <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">Button Text Color</label>
                   <input type="color" value={styles.buttonTextColor} onChange={(e) => setStyles({ ...styles, buttonTextColor: e.target.value })} className="w-full h-9 border border-gray-300 dark:border-gray-600 rounded cursor-pointer p-0.5" />
                 </div>
                 {styles.inputStyle !== 'underline' && ( 
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">Input Border Color</label>
                      <input type="color" value={styles.inputBorderColor} onChange={(e) => setStyles({ ...styles, inputBorderColor: e.target.value })} className="w-full h-9 border border-gray-300 dark:border-gray-600 rounded cursor-pointer p-0.5" />
                    </div>
                 )}
              </div>
            </div>
          </div>

          <div className="p-5 border rounded-lg bg-white dark:bg-gray-800 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Button & Redirect Settings</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">Submit Button Text</label>
                    {renderStyledInput('text', buttonText, (e) => setButtonText(e.target.value))}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Text on the form's submit button.</p>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">Redirect URL (after submission)</label>
                    {renderStyledInput('url', styles.redirectUrl, (e) => setStyles({ ...styles, redirectUrl: e.target.value }), "https://example.com/thank-you")}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Optional: Leave blank for no redirect.</p>
                </div>
            </div>
          </div>

          <div className="p-5 border rounded-lg bg-white dark:bg-gray-800 shadow-sm">
             <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Embed Code</h2>
             <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Copy this code and paste it into your website HTML.</p>
             <textarea
               readOnly
               value={generateEmbedCode()}
               className="w-full h-48 p-3 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-xs bg-gray-50 dark:bg-gray-700 dark:text-gray-300 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
             />
             <button
               onClick={copyEmbedCode}
               className="mt-3 w-full inline-flex justify-center items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
             >
               Copy Embed Code
             </button>
           </div>
        </div>


        {/* Right Column: Live Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <h2 className="text-xl font-semibold mb-4 text-center text-gray-700 dark:text-gray-200">Live Preview</h2>
            <div className={`p-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden bg-gray-200 dark:bg-gray-900`}>
              {/* The dangerouslySetInnerHTML will render the form with styles applied */}
              <div 
                className="form-preview-container" // Add a class for potential scoping if needed
                dangerouslySetInnerHTML={{ __html: generateEmbedCode().replace(/action="[^"]*"/, 'action="#"') /* Replace action for preview */ }} 
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">This is an interactive preview of your form.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
