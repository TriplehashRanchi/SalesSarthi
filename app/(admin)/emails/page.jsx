// components/EmailCampaignDashboard.jsx
'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import IconPencil from '@/components/icon/icon-pencil';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconPlus from '@/components/icon/icon-plus';
import TemplateParameterInput from '@/components/TemplateParmeterInput';
import { useAuth } from '@/context/AuthContext';
import { set } from 'lodash';
import { ActionIcon, Checkbox, Divider, Group, MultiSelect, Paper, ScrollArea, Stack, Text } from '@mantine/core';


const API_BASE_URL = 'https://api.digitalgyanisaarthi.com' || 'http://localhost:8000';

export default function EmailCampaignDashboard() {
  const [adminId, setAdminId] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(false);

    const { user } = useAuth();

    useEffect(() => {
        if (user) {
          setAdminId(user.admin_id);
        }
      }, [user]);
    

  // Auth + set bearer token
  useEffect(() => {
    const unsub = getAuth().onAuthStateChanged(user => {
      if (user) {
        user.getIdToken().then(token => {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        });
      }
    });
    return () => unsub();
  }, []);

  // Fetch list
  useEffect(() => {
    if (!adminId) return;
    axios
      .get(`${API_BASE_URL}/api/email/campaigns?admin_id=${adminId}`)
      .then(res => setCampaigns(res.data))
      .catch(console.error);
  }, [adminId, refresh]);

  const handleSave = (payload) => {
    // stringify JSON fields if needed
    const body = {
      ...payload,
      provider_settings: JSON.stringify(payload.provider_settings),
      template_params:    JSON.stringify(payload.template_params),
      additional_settings: JSON.stringify(payload.additional_settings || {})
    };
    const req = editing?.id
      ? axios.put(`${API_BASE_URL}/api/email/campaigns/${editing.id}`, body)
      : axios.post(`${API_BASE_URL}/api/email/campaigns`, body);

    req.then(() => {
      setEditing(null);
      setRefresh(r => !r);
    }).catch(console.error);
  };

  return (
    <div className="pt-5">
      <h1 className="text-2xl font-bold mb-6">Email Campaigns</h1>
      {editing ? (
        <EmailCampaignForm
          adminId={adminId}
          campaign={editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <>
          <div className="mb-4 text-right">
            <button className="btn btn-primary" onClick={() => setEditing({})}>
              <IconPlus className="w-5 h-5 mr-2 -ml-1" /> New Campaign
            </button>
          </div>
          <EmailCampaignList
            campaigns={campaigns}
            onEdit={c => setEditing(c)}
            onDelete={id => {
              if (confirm('Delete?')) {
                axios.delete(`${API_BASE_URL}/api/email/campaigns/${id}`)
                  .then(() => setRefresh(r=>!r))
                  .catch(console.error);
              }
            }}
          />
        </>
      )}
    </div>
  );
}

 function EmailCampaignList({ campaigns, onEdit, onDelete }) {
  return (
    <>
      {/* ─── Desktop Table ─── */}
      <div className="hidden md:block">
        <table className="table-auto w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Provider</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c, i) => (
              <tr
                key={c.id}
                className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50 dark:bg-gray-700'}
              >
                <td className="px-4 py-2">{c.campaign_name}</td>
                <td className="px-4 py-2">{c.automation_type}</td>
                <td className="px-4 py-2">{c.provider}</td>
                <td className="px-4 py-2">
                  {c.is_active ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-red-600">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => onEdit(c)}
                    className="inline-flex items-center px-2 py-1 border border-blue-500 text-blue-500 rounded mr-2"
                    title="Edit campaign"
                  >
                    <IconPencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(c.id)}
                    className="inline-flex items-center px-2 py-1 border border-red-500 text-red-500 rounded"
                    title="Delete campaign"
                  >
                    <IconTrashLines className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── Mobile Cards ─── */}
      <div className="block md:hidden">
        <ScrollArea style={{ height: '60vh' }} px="0">
          <Stack spacing="sm">
            {campaigns.map((c) => (
              <Paper
                key={c.id}
                p="sm"
                withBorder
                radius="md"
                className="flex flex-col gap-2 bg-white dark:bg-gray-800"
              >
                <Group position="apart" noWrap>
                  <Text weight={500} lineClamp={1}>
                    {c.campaign_name}
                  </Text>
                  <Checkbox
                    checked={c.is_active}
                    readOnly
                    label="Active"
                    size="xs"
                    className="text-xs"
                  />
                </Group>

                <Text size="xs" className="text-gray-600 dark:text-gray-400">
                  Type: {c.automation_type}
                </Text>
                <Text size="xs" className="text-gray-600 dark:text-gray-400">
                  Provider: {c.provider}
                </Text>

                <Divider my="xs" />

                <Group spacing="xs">
                  <ActionIcon
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(c)}
                    title="Edit"
                  >
                    <IconPencil size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="outline"
                    color="red"
                    size="sm"
                    onClick={() => onDelete(c.id)}
                    title="Delete"
                  >
                    <IconTrashLines size={16} />
                  </ActionIcon>
                </Group>
              </Paper>
            ))}
          </Stack>
        </ScrollArea>
      </div>
    </>
  );
}

/** Form */
function EmailCampaignForm({ adminId, campaign, onSave, onCancel }) {
  const isNew = !campaign.id;
  // convert maybe-string to object/array
const toObj  = v => (typeof v === 'string' ? JSON.parse(v) : v || {});
const toArr  = v => (typeof v === 'string' ? JSON.parse(v) : v || []);

  const [automationType, setAutomationType] = useState(campaign.automation_type || '');
  const [campaignName, setCampaignName] = useState(campaign.campaign_name || '');
  const [provider, setProvider] = useState(campaign.provider || 'nodemailer');
  const [providerSettings, setProviderSettings] = useState(() => {
      // ensure we ALWAYS have auth object to avoid “auth is undefined”
      const base = { host:'', port:587, secure:false, auth:{ user:'', pass:'' } };
      const saved = toObj(campaign.provider_settings);
      return { ...base, ...saved, auth: { ...base.auth, ...(saved?.auth || {}) } };
    });
  const [subjectTemplate, setSubjectTemplate] = useState(campaign.subject_template || '');
  const [bodyTemplate, setBodyTemplate] = useState(campaign.body_template || '');
  const [templateParams,     setTemplateParams]     = useState(toArr(campaign.template_params));
  const [additionalSettings, setAdditionalSettings] = useState(toObj(campaign.additional_settings));
  const [isActive, setIsActive] = useState(campaign.is_active ?? true);

  const [groups, setGroups]       = useState([]);     //  ← all groups from ML
const [selGroups, setSelGroups] = useState(
  providerSettings.groups || []  // ← already-saved IDs
);

// load once after providerSettings.apiKey is typed
useEffect(() => {
    if (provider !== 'mailerlite') return;
    if (!providerSettings.apiKey)  return;
  
    (async () => {
      try {
        const res  = await fetch('https://connect.mailerlite.com/api/groups', {
          headers: { Authorization: `Bearer ${providerSettings.apiKey}` }
        });
        const json = await res.json();
        console.log('[ML] groups', json);
        setGroups(json.data || []);
      } catch (err) {
        console.error('[ML] group-fetch error', err);
      }
    })();
  }, [provider, providerSettings.apiKey]);

  // your TemplateParameterInput as before...

  const handleParamChange = (idx, updated) => {
    const copy = [...templateParams];
    copy[idx] = updated;
    setTemplateParams(copy);
  };
  const addParameter = () => setTemplateParams((p) => [...p, { type: 'dynamic', field: '' }]);

  const removeParameter = (idx) => setTemplateParams((p) => p.filter((_, i) => i !== idx));

  const handleSubmit = e => {
    e.preventDefault();
    onSave({
      admin_id: adminId,
      automation_type: automationType,
      campaign_name: campaignName,
      provider,
      provider_settings: {
        ...providerSettings,
        groups: selGroups            //  ← add / overwrite
      },
      subject_template: subjectTemplate,
      body_template: bodyTemplate,
      template_params: templateParams,
      additional_settings: additionalSettings,
      is_active: isActive
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

  {/* ------------ Row: automationType & campaignName ------------ */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium mb-1">
        Automation Type<span className="text-red-500">*</span>
      </label>
      <select
        className="form-select w-full"
        required
        value={automationType}
        onChange={e => setAutomationType(e.target.value)}
      >
        <option value="" disabled>Select…</option>
        <option value="new_lead">New Lead</option>
        <option value="birthday">Birthday Reminder</option>
        <option value="conversion">Conversion</option>
      </select>
    </div>

    <div>
      <label className="block text-sm font-medium mb-1">
        Campaign Name<span className="text-red-500">*</span>
      </label>
      <input
        className="form-input w-full"
        required
        value={campaignName}
        onChange={e => setCampaignName(e.target.value)}
      />
    </div>
  </div>

  {/* ------------ Row: provider dropdown ------------ */}
  <div>
    <label className="block text-sm font-medium mb-1">Provider</label>
    <select
      className="form-select w-full"
      value={provider}
      onChange={e => setProvider(e.target.value)}
    >
      <option value="nodemailer">SMTP / Nodemailer</option>
      <option value="mailerlite">MailerLite API</option>
    </select>
  </div>

  {/* ------------ Row: provider settings ------------ */}
  {provider === 'nodemailer' ? (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
      <div>
        <label className="block text-sm font-medium mb-1">SMTP Host</label>
        <input
          className="form-input w-full"
          value={providerSettings.host}
          onChange={e =>
            setProviderSettings({ ...providerSettings, host: e.target.value })
          }
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Port</label>
        <input
          type="number"
          className="form-input w-full"
          value={providerSettings.port}
          onChange={e =>
            setProviderSettings({ ...providerSettings, port: Number(e.target.value) })
          }
        />
      </div>
   
      <div>
        <label className="block text-sm font-medium mb-1">SMTP User</label>
        <input
          className="form-input w-full"
          value={providerSettings.auth?.user || ''}
         onChange={e =>
           setProviderSettings(ps => ({
             ...ps,
             auth: { ...(ps.auth || { user:'', pass:'' }), user: e.target.value }
           }))
         }
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">SMTP Pass</label>
        <input
          type="password"
          className="form-input w-full"
          value={providerSettings.auth?.pass || ''}
          onChange={e =>
            setProviderSettings(ps => ({
              ...ps,
              auth: { ...(ps.auth || { user:'', pass:'' }), pass: e.target.value }
            }))
          }
        />
      </div>
      <div className="flex items-center space-x-2">
        <input
          id="secure"
          type="checkbox"
          className="form-checkbox"
          checked={providerSettings.secure}
          onChange={e =>
            setProviderSettings({ ...providerSettings, secure: e.target.checked })
          }
        />
        <label htmlFor="secure" className="text-sm">Use SSL/TLS</label>
      </div>
    </div>
  ) : (
    // ------------ Row: MailerLite settings ------------
    <div className="border p-4 rounded-md space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">MailerLite API Key</label>
        <input
          className="form-input w-full"
          value={providerSettings.apiKey || ''}
          onChange={e =>
            setProviderSettings(ps => ({ ...ps, apiKey: e.target.value }))
          }
        />
      </div>
      <div>
       {/* multi-select for groups */}
  <label className="block text-sm font-medium mb-1 mt-3">Groups</label>
 {/* ── MailerLite groups picker ─────────────────────────────── */}
<MultiSelect
  label      ="Groups"
  placeholder="Start typing to filter…"
  searchable
  nothingFound="No group"
  data={groups.map(g => ({ value: g.id, label: `${g.name} (${g.total})` }))}
  value={selGroups}
  onChange={setSelGroups}
  withinPortal    // avoids z-index battles in modals/drawers
  maxDropdownHeight={180}
/>

      </div>
    </div>
  )}

  {/* ------------ Row: subject & body templates ------------ */}

  {provider === 'nodemailer' && (
      <>
        <div>
    <label className="block text-sm font-medium mb-1">
      Subject Template<span className="text-red-500">*</span>
    </label>
    <input
      className="form-input w-full"
      required
      value={subjectTemplate}
      onChange={e => setSubjectTemplate(e.target.value)}
      placeholder="e.g. Welcome {{param0}}!"
    />
  </div>

  <div>
    <label className="block text-sm font-medium mb-1">
      Body Template (HTML)<span className="text-red-500">*</span>
    </label>
    <textarea
      className="form-textarea w-full h-32"
      required
      value={bodyTemplate}
      onChange={e => setBodyTemplate(e.target.value)}
      placeholder="<p>Hello {{param0}}, thanks for joining…</p>"
    />
  </div>

  {/* ------------ Template params array ------------ */}
  <div>
    <label className="block text-sm font-medium mb-1">Template Parameters</label>
    <div className="space-y-3">
      {templateParams.map((param, idx) => (
        <TemplateParameterInput
          key={idx}
          param={param}
          index={idx}
          onChange={handleParamChange}
          onRemove={() => removeParameter(idx)}
        />
      ))}
    </div>
    <button type="button" className="btn btn-outline-primary mt-2" onClick={addParameter}>
      <IconPlus className="w-4 h-4 mr-1" /> Add Parameter
    </button>
  </div>
      </>
  )}


  {/* ------------ Active toggle ------------ */}
  <div className="flex items-center">
    <input
      type="checkbox"
      className="form-checkbox"
      checked={isActive}
      onChange={e => setIsActive(e.target.checked)}
      id="activeToggle"
    />
    <label htmlFor="activeToggle" className="ml-2 text-sm">Active</label>
  </div>

  {/* ------------ Submit / Cancel ------------ */}
  <div className="flex justify-end space-x-3 pt-4 border-t">
    <button type="button" onClick={onCancel} className="btn btn-outline-secondary">
      Cancel
    </button>
    <button type="submit" className="btn btn-primary">
      {isNew ? 'Create Campaign' : 'Update Campaign'}
    </button>
  </div>
</form>

  );
}
