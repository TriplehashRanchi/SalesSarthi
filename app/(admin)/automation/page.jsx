'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import IconPencil from '@/components/icon/icon-pencil';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconPlus from '@/components/icon/icon-plus';

// Determine the base API URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:5000';

/**
 * CampaignList Component
 * Renders a styled table of automation campaigns.
 */
const CampaignList = ({ adminId, onEdit, refresh, onLoaded }) => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
      setLoading(true);
      setError(null);
      axios
          .get(`${API_BASE_URL}/api/automation/campaigns?admin_id=${adminId}`)
          .then((res) => {
              setCampaigns(res.data);
              setLoading(false);
              // Call the onLoaded callback if provided
              if (typeof onLoaded === 'function') {
                  onLoaded(res.data);
              }
          })
          .catch((err) => {
              console.error('Error fetching campaigns:', err);
              setError('Failed to load campaigns.');
              setLoading(false);
          });
  }, [adminId, refresh]);
  

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this campaign?')) {
            axios
                .delete(`${API_BASE_URL}/api/automation/campaigns/${id}`)
                .then(() => {
                    setCampaigns(campaigns.filter((campaign) => campaign.id !== id));
                })
                .catch((err) => {
                    console.error('Error deleting campaign:', err);
                    alert('Failed to delete campaign.');
                });
        }
    };

    if (loading) return <div className="text-center p-5">Loading campaigns...</div>;
    if (error) return <div className="text-center p-5 text-red-500">{error}</div>;

    return (
        <div className="panel mt-6">
            <h2 className="text-xl font-semibold mb-5">Campaign List</h2>
            <div className="table-responsive mb-5">
                <table className="table-hover">
                    <thead>
                        <tr>
                            <th className="ltr:rounded-l-md rtl:rounded-r-md">Campaign Name</th>
                            <th>Automation Type</th>
                            <th>Status</th>
                            <th className="text-center ltr:rounded-r-md rtl:rounded-l-md">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {campaigns.map((campaign) => (
                            <tr key={campaign.id}>
                                <td>{campaign.campaign_name}</td>
                                <td className="capitalize">{campaign.automation_type.replace('_', ' ')}</td>
                                <td>
                                    <span className={`badge ${campaign.is_active ? 'badge-outline-success' : 'badge-outline-danger'}`}>
                                        {campaign.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="text-center">
                                    <div className="flex justify-center items-center space-x-2">
                                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => onEdit(campaign)}>
                                            <IconPencil className="w-4 h-4 mr-1" /> Edit
                                        </button>
                                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(campaign.id)}>
                                            <IconTrashLines className="w-4 h-4 mr-1" /> Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {campaigns.length === 0 && (
                            <tr>
                                <td colSpan="4" className="text-center font-semibold py-4">
                                    No campaigns found. Create one to get started!
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

/**
 * TemplateParameterInput Component
 * Allows adding/editing of one template parameter with Tailwind styling.
 */
const availableFields = [
    { value: 'full_name', label: 'Full Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone_number', label: 'Phone Number' },
    { value: 'lead_status', label: 'Lead Status' },
    { value: 'insurance_type', label: 'Insurance Type' },
    { value: 'policy_number', label: 'Policy Number' },
    { value: 'coverage_amount', label: 'Coverage Amount' },
    { value: 'preferred_plan', label: 'Preferred Plan' },
];

const TemplateParameterInput = ({ param, index, onChange, onRemove }) => {
    const handleTypeChange = (e) => {
        onChange(index, { ...param, type: e.target.value, field: e.target.value === 'dynamic' ? '' : undefined, value: e.target.value === 'fixed' ? '' : undefined });
    };

    const handleFieldChange = (e) => {
        onChange(index, { ...param, field: e.target.value });
    };

    const handleValueChange = (e) => {
        onChange(index, { ...param, value: e.target.value });
    };

    return (
        <div className="flex items-center space-x-3 mb-3 p-3 border border-gray-200 dark:border-gray-700 rounded-md">
            <select value={param.type} onChange={handleTypeChange} className="form-select w-1/3">
                <option value="dynamic">Dynamic Field</option>
                <option value="fixed">Fixed Value</option>
            </select>
            {param.type === 'dynamic' ? (
                <select value={param.field || ''} onChange={handleFieldChange} className="form-select flex-grow">
                    <option value="" disabled>
                        Select Lead Field...
                    </option>
                    {availableFields.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            ) : (
                <input
                    type="text"
                    placeholder="Enter fixed value"
                    value={param.value || ''}
                    onChange={handleValueChange}
                    className="form-input flex-grow"
                />
            )}
            <button type="button" onClick={() => onRemove(index)} className="btn btn-outline-danger btn-sm p-2">
                <IconTrashLines className="w-4 h-4" />
            </button>
        </div>
    );
};

/**
 * CampaignForm Component
 * Styled form for creating or editing a campaign using Tailwind CSS.
 */
const CampaignForm = ({ adminId, campaign, onSave, onCancel }) => {
    const [automationType, setAutomationType] = useState(campaign?.automation_type || '');
    const [campaignName, setCampaignName] = useState(campaign?.campaign_name || '');
    const [apiKey, setApiKey] = useState(campaign?.api_key || '');
    const [templateParams, setTemplateParams] = useState(
        campaign && campaign.template_params ? (typeof campaign.template_params === 'string' ? JSON.parse(campaign.template_params) : campaign.template_params) : []
    );
    const [additionalSettings, setAdditionalSettings] = useState(
        campaign && campaign.additional_settings ? (typeof campaign.additional_settings === 'string' ? JSON.parse(campaign.additional_settings) : campaign.additional_settings) : {}
    );
    const [isActive, setIsActive] = useState(campaign?.is_active ?? true);
    const [mediaUrl, setMediaUrl] = useState(campaign?.media?.url || "");
    const [mediaFilename, setMediaFilename] = useState(campaign?.media?.filename || "");


    const handleParamChange = (index, updatedParam) => {
        const newParams = [...templateParams];
        newParams[index] = updatedParam;
        setTemplateParams(newParams);
    };

    const addParameter = () => {
        setTemplateParams([...templateParams, { type: 'dynamic', field: '' }]);
    };

    const removeParameter = (index) => {
        setTemplateParams(templateParams.filter((_, idx) => idx !== index));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!automationType || !campaignName) {
            alert('Please fill in Automation Type and Campaign Name.');
            return;
        }
        const payload = {
            admin_id: adminId,
            automation_type: automationType,
            campaign_name: campaignName,
            api_key: apiKey, // API Key might be optional depending on use case
            template_params: templateParams, // Ensure this is stringified if the backend expects a string
            additional_settings: additionalSettings, // Ensure this is stringified if the backend expects a string
            is_active: isActive,
            media: {
              url: mediaUrl,
              filename: mediaFilename,
          }
        };
        onSave(payload);
    };

    return (
        <div className="panel">
            <h2 className="text-xl font-semibold mb-5">{campaign?.id ? 'Edit Campaign' : 'Create New Campaign'}</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="automationType" className="block text-sm font-medium mb-1">
                            Automation Type <span className="text-red-500">*</span>
                        </label>
                        <select id="automationType" value={automationType} onChange={(e) => setAutomationType(e.target.value)} className="form-select w-full" required>
                            <option value="" disabled>
                                Select Type...
                            </option>
                            <option value="new_lead">New Lead</option>
                            <option value="birthday">Birthday Reminder</option>
                            <option value="conversion">Lead Conversion</option>
                            {/* Add other types as needed */}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="campaignName" className="block text-sm font-medium mb-1">
                            Campaign Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="campaignName"
                            type="text"
                            value={campaignName}
                            onChange={(e) => setCampaignName(e.target.value)}
                            placeholder="e.g., Welcome Email Sequence"
                            className="form-input w-full"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="apiKey" className="block text-sm font-medium mb-1">
                        API Key (Optional)
                    </label>
                    <input id="apiKey" type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Enter API key if required by automation" className="form-input w-full" />
                </div>

                <div>
                    <label htmlFor="mediaUrl" className="block text-sm font-medium mb-1">
                        Media URL (Optional)
                    </label>
                    <input id="mediaUrl" type="text" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="Enter media URL" className="form-input w-full" />
                </div>

                <div>
                    <label htmlFor="mediaFilename" className="block text-sm font-medium mb-1">
                        Media Filename (Optional)
                    </label>
                    <input id="mediaFilename" type="text" value={mediaFilename} onChange={(e) => setMediaFilename(e.target.value)} placeholder="Enter media filename" className="form-input w-full" />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Template Parameters</label>
                    <div className="space-y-3">
                        {templateParams.map((param, index) => (
                            <TemplateParameterInput key={index} param={param} index={index} onChange={handleParamChange} onRemove={removeParameter} />
                        ))}
                    </div>
                    <button type="button" onClick={addParameter} className="btn btn-outline-primary mt-3">
                        <IconPlus className="w-4 h-4 mr-1" /> Add Parameter
                    </button>
                </div>

                {/* <div>
                    <label htmlFor="followupDelay" className="block text-sm font-medium mb-1">
                        Follow-up Delay (Hours)
                    </label>
                    <input
                        id="followupDelay"
                        type="number"
                        min="0"
                        value={additionalSettings.followup_delay_hours || ''}
                        onChange={(e) => setAdditionalSettings({ ...additionalSettings, followup_delay_hours: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                        placeholder="e.g., 8 (Leave blank if not applicable)"
                        className="form-input w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">Delay before the first message in this campaign is sent (for applicable types like 'New Lead').</p>
                </div> */}

                <div>
                    <label className="inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="form-checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                        <span className="ml-2">Activate Campaign</span>
                    </label>
                </div>

                <div className="flex justify-end space-x-3 pt-5 border-t border-gray-200 dark:border-gray-700">
                    <button type="button" onClick={onCancel} className="btn btn-outline-secondary">
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                        {campaign?.id ? 'Update Campaign' : 'Create Campaign'}
                    </button>
                </div>
            </form>
            {/* Optional: Keep preview if needed, style it */}
            {/* <CampaignPreview campaignData={{ ... }} /> */}
        </div>
    );
};

/**
 * CampaignPreview Component (Optional - can be removed or styled)
 * Provides a live JSON preview of the campaign payload.
 */
const CampaignPreview = ({ campaignData }) => {
    return (
        <div className="panel mt-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-3">Campaign Data Preview</h3>
            <pre className="bg-white dark:bg-black p-4 rounded-md overflow-x-auto text-sm">
                {JSON.stringify(campaignData, null, 2)}
            </pre>
        </div>
    );
};

/**
 * CampaignDashboard Component
 * Main component managing state and rendering list or form.
 */
const CampaignDashboard = () => {
    const [adminId, setAdminId] = useState(null);
    const [editingCampaign, setEditingCampaign] = useState(null); // null: show list, {}: new form, object: edit form
    const [refresh, setRefresh] = useState(false);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [defaultApiKey, setDefaultApiKey] = useState("");


    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = auth.onAuthStateChanged(user => {
            if (user) {
                user.getIdToken()
                    .then((token) => {
                        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                        setAdminId(user.uid); 
                        setLoadingAuth(false);
                    })
                    .catch(err => {
                        console.error("Error retrieving token:", err);
                        setLoadingAuth(false);
                        // Handle token error (e.g., redirect to login)
                    });
            } else {
                console.error("User is not authenticated");
                setAdminId(null);
                setLoadingAuth(false);
                // Handle unauthenticated state (e.g., redirect to login)
            }
        });
        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    const handleCampaignsLoaded = (loadedCampaigns) => {
      if (loadedCampaigns && loadedCampaigns.length > 0 && !defaultApiKey) {
          setDefaultApiKey(loadedCampaigns[0].api_key);
      }
  };

    const handleSaveCampaign = (payload) => {
        // Ensure params/settings are stringified if backend expects strings
        const formattedPayload = {
            ...payload,
            template_params: JSON.stringify(payload.template_params || []),
            additional_settings: JSON.stringify(payload.additional_settings || {}),
            media: payload.media ? JSON.stringify(payload.media) : null
        };

        const request = editingCampaign?.id
            ? axios.put(`${API_BASE_URL}/api/automation/campaigns/${editingCampaign.id}`, formattedPayload)
            : axios.post(`${API_BASE_URL}/api/automation/campaigns`, formattedPayload);

        request
            .then(() => {
                setEditingCampaign(null); // Go back to list view
                setRefresh(!refresh); // Trigger list refresh
            })
            .catch((err) => {
                console.error(`Error ${editingCampaign?.id ? 'updating' : 'creating'} campaign:`, err);
                alert(`Failed to ${editingCampaign?.id ? 'update' : 'create'} campaign. Check console for details.`);
            });
    };

    const handleEdit = (campaign) => {
        // Parse JSON strings back into objects for the form
        const campaignToEdit = {
            ...campaign,
            template_params: campaign.template_params ? JSON.parse(campaign.template_params) : [],
            additional_settings: campaign.additional_settings ? JSON.parse(campaign.additional_settings) : {},
        };
        setEditingCampaign(campaignToEdit);
    };

    const handleCancel = () => {
        setEditingCampaign(null); // Go back to list view
    };

    const handleCreateNew = () => {
      setEditingCampaign({ api_key: defaultApiKey });// Show empty form
    };

    if (loadingAuth) {
        return <div className="flex justify-center items-center h-screen"><span className="animate-spin border-4 border-primary border-l-transparent rounded-full w-10 h-10 inline-block align-middle m-auto"></span></div>;
    }

    if (!adminId) {
        // Consider redirecting to login or showing a login prompt
        return <div className="p-5 text-center text-red-600 font-semibold">Authentication required. Please log in to manage automation campaigns.</div>;
    }

    return (
        <div className="pt-5">
            <h1 className="text-2xl font-bold mb-6">Automation Campaign Dashboard</h1>
            {editingCampaign === null ? (
                // View Mode: Show List and Create Button
                <>
                    <div className="mb-6 text-right">
                        <button type="button" className="btn btn-primary" onClick={handleCreateNew}>
                           <IconPlus className="w-5 h-5 mr-2 -ml-1" /> Create New Campaign
                        </button>
                    </div>
                    <CampaignList adminId={adminId} onEdit={handleEdit} refresh={refresh} onLoaded={handleCampaignsLoaded} />
                </>
            ) : (
                // Edit/Create Mode: Show Form
                <CampaignForm
                    adminId={adminId}
                    campaign={editingCampaign} // Pass empty object {} for new, or campaign data for edit
                    onSave={handleSaveCampaign}
                    onCancel={handleCancel}
                />
            )}
             {/* Conditionally render preview if needed */}
             {editingCampaign && (
                <CampaignPreview
                    campaignData={{
                        automation_type: editingCampaign.automation_type || '',
                        campaign_name: editingCampaign.campaign_name || '',
                        api_key: editingCampaign.api_key || '',
                        template_params: editingCampaign.template_params || [],
                        additional_settings: editingCampaign.additional_settings || {},
                        is_active: editingCampaign.is_active ?? true
                    }}
                 />
             )}
        </div>
    );
};

export default CampaignDashboard;
