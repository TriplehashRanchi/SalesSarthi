'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import {
  Button,
  Card,
  Modal,
  Loader,
  Group,
  Title,
  Text,
  Box,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import TemplateForm from './TemplateForm';

const preDefinedCategories = [
  { value: 'nurturing', label: 'Nurturing (New Lead)' },
  { value: 'appointment', label: 'Appointment Reminder' },
  { value: 'birthday', label: 'Birthday Wish' },
  { value: 'anniversary', label: 'Anniversary Wish' },
  { value: 'renewal', label: 'Policy Renewal' },
];

// New structure for pre-defined templates
const preDefinedTemplates = {
  nurturing: [
    { id: 'nurt_1', name: 'Welcome - Quick', message: 'Hi {name}, welcome! We are excited to have you. We will be in touch shortly.' },
    { id: 'nurt_2', name: 'Welcome - Detailed', message: 'Hello {name},\n\nThank you for joining us! We offer [mention key benefit 1] and [mention key benefit 2]. Expect a follow-up from our team soon.\n\nBest,\n[Your Company Name]' },
    { id: 'nurt_3', name: 'Follow-up - Gentle', message: 'Hi {name},\n\nJust checking in to see if you have any questions after our initial welcome. We are here to help!\n\nRegards,\n[Your Company Name]' },
    { id: 'nurt_4', name: 'Resource Share', message: 'Hello {name},\n\nWe thought you might find this resource helpful: [Link/Resource Name].\n\nFeel free to reach out if you need anything.\n\nThanks,\n[Your Company Name]' },
    { id: 'nurt_5', name: 'Engagement Question', message: 'Hi {name},\n\nTo better assist you, could you let us know what you are most interested in regarding [topic/service]?\n\nSincerely,\n[Your Company Name]' },
  ],
  appointment: [
    { id: 'appt_1', name: 'Reminder - 24hr', message: 'Hi {name},\n\nThis is a friendly reminder for your appointment tomorrow, {appointment_date}, at [Time].\n\nSee you then!\n[Your Company Name]' },
    { id: 'appt_2', name: 'Reminder - Same Day', message: 'Hello {name},\n\nYour appointment is scheduled for today, {appointment_date}, at [Time]. We look forward to seeing you.\n\nIf you need to reschedule, please call us at [Phone Number].\n[Your Company Name]' },
    { id: 'appt_3', name: 'Confirmation Request', message: 'Dear {name},\n\nPlease confirm your attendance for your appointment on {appointment_date} at [Time] by replying to this message or calling us.\n\nThank you,\n[Your Company Name]' },
    { id: 'appt_4', name: 'Pre-appointment Info', message: 'Hi {name},\n\nAhead of your appointment on {appointment_date}, please remember to bring [document/item] and [another document/item if any].\n\nThanks,\n[Your Company Name]' },
    { id: 'appt_5', name: 'Post-appointment Follow-up', message: 'Hello {name},\n\nIt was great seeing you on {appointment_date}. Please let us know if you have any further questions.\n\nBest regards,\n[Your Company Name]' },
  ],
  birthday: [
    { id: 'bday_1', name: 'Simple Wish', message: 'Happy Birthday, {name}! Hope you have a wonderful day.' },
    { id: 'bday_2', name: 'Warm Wish', message: 'Dear {name},\n\nWishing you a very Happy Birthday filled with joy and laughter! From all of us at [Your Company Name].' },
    { id: 'bday_3', name: 'Offer Included', message: 'Happy Birthday, {name}!\n\nTo celebrate your special day, here’s a small token from us: [Special Offer]. Enjoy!\n\nBest,\n[Your Company Name]' },
    { id: 'bday_4', name: 'Reflective Wish', message: 'Hi {name},\n\nAnother year, another milestone! Happy Birthday! We appreciate your continued association with us.\n\nWarmly,\n[Your Company Name]' },
  ],
  anniversary: [
    { id: 'anni_1', name: 'Simple Thanks', message: 'Happy Anniversary, {name}! Thanks for being a valued client.' },
    { id: 'anni_2', name: 'Detailed Appreciation', message: 'Dear {name},\n\nToday marks your anniversary with us! We truly appreciate your loyalty and trust in [Your Company Name] over the past year(s).\n\nSincerely,' },
    { id: 'anni_3', name: 'Looking Forward', message: 'Happy Anniversary, {name}!\n\nWe are grateful for your business and look forward to continuing to serve you in the years to come.\n\nBest,\n[Your Company Name]' },
  ],
  renewal: [
    { id: 'renw_1', name: 'Renewal Notice - Gentle', message: 'Hi {name},\n\nYour policy {policy_number} is due for renewal on {renewal_date}. We will be in touch soon to discuss options.' },
    { id: 'renw_2', name: 'Renewal Notice - Action Required', message: 'Dear {name},\n\nImportant: Your policy {policy_number} is set to renew on {renewal_date}. Please contact us at your earliest convenience to ensure continuous coverage.\n\nRegards,\n[Your Company Name]' },
    { id: 'renw_3', name: 'Renewal Benefits', message: 'Hello {name},\n\nAs your policy {policy_number} renewal on {renewal_date} approaches, let’s review the benefits and any new options available to you.\n\nContact us today!\n[Your Company Name]' },
    { id: 'renw_4', name: 'Last Reminder', message: 'Hi {name},\n\nFinal reminder: Your policy {policy_number} renews on {renewal_date}. Avoid a lapse in coverage by contacting us immediately.\n\nThanks,\n[Your Company Name]' },
  ],
};


const TemplateManagementPage = () => {
  const [templates, setTemplates] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null); // The actual saved template data
  const [activeCategory, setActiveCategory] = useState(null); // The category object being edited/created for
  const [modalOpened, setModalOpened] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
          showNotification({ title: 'Error', message: 'You must be logged in.', color: 'red' });
          return;
        }
        const idToken = await user.getIdToken();
        setToken(idToken);
        const res = await axios.get(`${API_URL}/api/templates`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        setTemplates(res.data);
      } catch (error) {
        console.error('Error fetching templates:', error);
        showNotification({ title: 'Error', message: 'Failed to fetch templates.', color: 'red' });
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, [API_URL]);

  const handleEditCategory = (category) => {
    const foundTemplate = templates.find(
      (temp) => temp.category === category.value
    );
    setActiveCategory(category); // Set the category context for the modal
    setActiveTemplate(foundTemplate || null); // Set the existing template data, or null if new
    setModalOpened(true);
  };

  const handleSaveTemplate = (savedTemplate, isEditing) => {
    let updatedTemplates;
    if (isEditing) {
      updatedTemplates = templates.map((t) =>
        t.id === savedTemplate.id ? savedTemplate : t
      );
    } else {
      updatedTemplates = [
        ...templates.filter((t) => t.category !== savedTemplate.category),
        savedTemplate,
      ];
    }
    setTemplates(updatedTemplates);
    showNotification({
      title: 'Success',
      message: `Template for ${
        preDefinedCategories.find(cat => cat.value === savedTemplate.category)?.label || savedTemplate.category
      } ${isEditing ? 'updated' : 'created'} successfully.`,
      color: 'green',
    });
    setModalOpened(false);
  };

  return (
    <Box p="md">
      <Title order={2} mb="md">Template Management</Title>
      {loading ? <Loader /> : (
        preDefinedCategories.map((category) => {
          const template = templates.find((t) => t.category === category.value);
          return (
            <Card key={category.value} shadow="sm" mb="sm" withBorder>
              <Group position="apart" mb="xs">
                <Text weight={500}>{category.label}</Text>
                <Button variant="light" size="xs" onClick={() => handleEditCategory(category)}>
                  {template ? 'Edit Template' : 'Create Template'}
                </Button>
              </Group>
              {template ? (
                <>
                  <Text size="sm" mb="md" style={{ whiteSpace: 'pre-wrap' }}>
                    {template.template_message}
                  </Text>
                  <Text size="xs" color="dimmed">Template ID: {template.id}</Text>
                </>
              ) : (
                <Text size="sm" color="dimmed">
                  No template created. Click 'Create Template' to start.
                  {(preDefinedTemplates[category.value] && preDefinedTemplates[category.value].length > 0) ? ' You can choose from suggestions.' : ''}
                </Text>
              )}
            </Card>
          );
        })
      )}

      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setActiveCategory(null); // Clear context when modal closes
          setActiveTemplate(null);
        }}
        title={`${activeTemplate ? 'Edit Template for' : 'Create Template for'} ${activeCategory?.label || ''}`}
        size="lg"
      >
        {/* Ensure activeCategory is present before rendering form */}
        {activeCategory && (
          <TemplateForm
            initialData={activeTemplate} // This is the currently saved template object or null
            categoryValue={activeCategory.value} // The string value like "nurturing"
            // Pass the specific list of pre-defined templates for this category
            predefinedTemplatesForCategory={preDefinedTemplates[activeCategory.value] || []}
            onSave={handleSaveTemplate}
            token={token}
            apiUrl={API_URL}
          />
        )}
      </Modal>
    </Box>
  );
};

export default TemplateManagementPage;