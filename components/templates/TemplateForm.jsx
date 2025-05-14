'use client';

import { useEffect, useState, useRef } from 'react';
import { Textarea, Button, Group, Text, Select, Box } from '@mantine/core';
import axios from 'axios';
import { showNotification } from '@mantine/notifications';

const availableVariables = [
  { value: '{name}', label: 'Name' },
  { value: '{policy_number}', label: 'Policy Number' },
  { value: '{dob}', label: 'Date of Birth' },
  { value: '{renewal_date}', label: 'Renewal Date' },
  { value: '{appointment_date}', label: 'Appointment Date' },
];

// Special key for the Select component to represent a custom/edited message
const CUSTOM_TEMPLATE_KEY = '__custom_edited__';

const TemplateForm = ({
  initialData, // Existing template data from DB { id, template_message, category } or null
  categoryValue, // e.g., 'nurturing'
  predefinedTemplatesForCategory, // Array: [{ id, name, message }, ...]
  onSave,
  apiUrl,
  token,
}) => {
  const [templateMessage, setTemplateMessage] = useState('');
  const [selectedPredefinedKey, setSelectedPredefinedKey] = useState(null); // Stores id of selected predefined or CUSTOM_TEMPLATE_KEY
  const [loading, setLoading] = useState(false);
  const textAreaRef = useRef(null);

  // Prepare data for the Select component
  const selectOptions = [
    { value: CUSTOM_TEMPLATE_KEY, label: 'Custom / Edited Message' },
    ...(predefinedTemplatesForCategory || []).map(pt => ({ value: pt.id, label: pt.name })),
  ];

  useEffect(() => {
    if (initialData && initialData.template_message) {
      setTemplateMessage(initialData.template_message);
      // Check if current message matches any predefined template
      const matchedPredefined = (predefinedTemplatesForCategory || []).find(
        pt => pt.message === initialData.template_message
      );
      if (matchedPredefined) {
        setSelectedPredefinedKey(matchedPredefined.id);
      } else {
        setSelectedPredefinedKey(CUSTOM_TEMPLATE_KEY); // Mark as custom if no exact match
      }
    } else {
      // New template, or no initial message
      setTemplateMessage('');
      setSelectedPredefinedKey(null); // Nothing selected yet, placeholder will show
    }
  }, [initialData, predefinedTemplatesForCategory]);

  const handlePredefinedSelectChange = (value) => {
    setSelectedPredefinedKey(value);
    if (value && value !== CUSTOM_TEMPLATE_KEY) {
      const selectedTemplate = predefinedTemplatesForCategory.find(t => t.id === value);
      if (selectedTemplate) {
        setTemplateMessage(selectedTemplate.message);
      }
    } else if (value === CUSTOM_TEMPLATE_KEY) {
      // User explicitly selected "Custom", message in textarea is kept.
      // If they want to start blank from here, they'd need to clear the textarea.
    } else { // Value is null (if Select is clearable and cleared)
      setTemplateMessage('');
    }
  };

  const handleTextAreaChange = (event) => {
    const newMessage = event.currentTarget.value;
    setTemplateMessage(newMessage);

    if (selectedPredefinedKey && selectedPredefinedKey !== CUSTOM_TEMPLATE_KEY) {
      // If a predefined template was selected, check if message still matches
      const currentSelectedObject = predefinedTemplatesForCategory.find(t => t.id === selectedPredefinedKey);
      if (currentSelectedObject && currentSelectedObject.message !== newMessage) {
        setSelectedPredefinedKey(CUSTOM_TEMPLATE_KEY); // Message has been edited
      }
    } else if (!selectedPredefinedKey && newMessage !== '') {
      // If nothing was selected and user starts typing, it's custom
      setSelectedPredefinedKey(CUSTOM_TEMPLATE_KEY);
    }
  };

  const handleInsertVariable = (variable) => {
    if (textAreaRef.current) {
      const textarea = textAreaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = templateMessage;
      const newValue = currentValue.substring(0, start) + variable + currentValue.substring(end);
      setTemplateMessage(newValue);

      // If a predefined template was selected, and message changes due to variable insertion
      if (selectedPredefinedKey && selectedPredefinedKey !== CUSTOM_TEMPLATE_KEY) {
        const currentSelectedObject = predefinedTemplatesForCategory.find(t => t.id === selectedPredefinedKey);
        if (currentSelectedObject && currentSelectedObject.message !== newValue) {
          setSelectedPredefinedKey(CUSTOM_TEMPLATE_KEY);
        }
      } else if (!selectedPredefinedKey && newValue !== '') {
         setSelectedPredefinedKey(CUSTOM_TEMPLATE_KEY);
      }

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + variable.length;
        textarea.focus();
      }, 0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!templateMessage.trim()) {
        showNotification({ title: 'Validation Error', message: 'Template message cannot be empty.', color: 'orange' });
        return;
    }
    setLoading(true);
    const dataToSend = {
      template_message: templateMessage,
      category: categoryValue,
    };

    try {
      let res;
      if (initialData && initialData.id) { // Editing an existing template
        res = await axios.put(`${apiUrl}/api/templates/${initialData.id}`, dataToSend, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        });
        onSave(res.data, true); // true for isEditing
      } else { // Creating a new template
        res = await axios.post(`${apiUrl}/api/templates`, dataToSend, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        });
        onSave(res.data, false); // false for isEditing
      }
    } catch (error) {
      console.error('Error saving template:', error.response ? error.response.data : error);
      showNotification({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to save template.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Box mb="md">
        <Select
          label="Choose a Pre-made Template (Optional)"
          placeholder="Select a template or write your own below"
          value={selectedPredefinedKey}
          onChange={handlePredefinedSelectChange}
          data={selectOptions}
          clearable
          allowDeselect // Allows user to clear selection back to null
        />
      </Box>

      <Textarea
        label="Template Message"
        value={templateMessage}
        onChange={handleTextAreaChange}
        required
        ref={textAreaRef}
        minRows={7}
        autosize
        mb="md"
      />

      <Box mb="md">
        <Text size="sm" weight={500} mb="xs">Insert Variable:</Text>
        <Group spacing="xs">
          {availableVariables.map((variable) => (
            <Button
              key={variable.value}
              size="xs"
              variant="outline"
              onClick={() => handleInsertVariable(variable.value)}
            >
              {variable.label}
            </Button>
          ))}
        </Group>
      </Box>

      <Group position="right" mt="xl">
        <Button type="submit" loading={loading}>
          {initialData ? 'Update Template' : 'Create Template'}
        </Button>
      </Group>
    </form>
  );
};

export default TemplateForm;