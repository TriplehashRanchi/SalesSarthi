'use client';

import { useEffect, useState, useRef } from 'react';
import { Textarea, Button, Group } from '@mantine/core';
import axios from 'axios';
import { showNotification } from '@mantine/notifications';

const availableVariables = [
  { value: '{name}', label: 'Name' },
  { value: '{policy_number}', label: 'Policy Number' },
  { value: '{dob}', label: 'Date of Birth' },
  { value: '{renewal_date}', label: 'Renewal Date' },
  { value: '{appointment_date}', label: 'Appointment Date' },
  // Add any additional placeholders as needed
];

const TemplateForm = ({ initialData, category, onSave, apiUrl, token }) => {

    console.log('API tokwn:', token);
  // Removed template_name from state since it's irrelevant now.
  const [formData, setFormData] = useState({
    template_message: initialData ? initialData.template_message : '',
    category: category || 'new_lead',
  });
  const [loading, setLoading] = useState(false);
  const textAreaRef = useRef(null);

  // Update the form when initialData or category changes.
  useEffect(() => {
    if (initialData) {
      setFormData({
        template_message: initialData.template_message,
        category: initialData.category,
      });
    } else {
      setFormData({
        template_message: '',
        category: category || 'new_lead',
      });
    }
  }, [initialData, category]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Inserts a placeholder variable into template_message at the current cursor position.
  const handleInsertVariable = (variable) => {
    if (textAreaRef.current) {
      const textarea = textAreaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = formData.template_message;
      const newValue = currentValue.substring(0, start) + variable + currentValue.substring(end);
      setFormData((prev) => ({ ...prev, template_message: newValue }));
      // Reset cursor position after insertion.
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + variable.length;
        textarea.focus();
      }, 0);
    } else {
      // Fallback: simply append the variable
      setFormData((prev) => ({
        ...prev,
        template_message: prev.template_message + ' ' + variable,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      if (initialData) {
        // Update the existing template.
        res = await axios.put(`${apiUrl}/api/templates/${initialData.id}`, formData, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        }});
      } else {
        // Create a new template.
        res = await axios.post(`${apiUrl}/api/templates`, formData, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
          }});
      }
      onSave(res.data, Boolean(initialData));
    } catch (error) {
      console.error('Error saving template:', error);
      showNotification({
        title: 'Error',
        message: 'Failed to save template',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Textarea
        label="Template Message"
        name="template_message"
        value={formData.template_message}
        onChange={handleChange}
        required
        ref={textAreaRef}
      />
      <Group spacing="xs" mt="sm">
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
      <Group position="right" mt="md">
        <Button type="submit" loading={loading}>
          {initialData ? 'Update Template' : 'Create Template'}
        </Button>
      </Group>
    </form>
  );
};

export default TemplateForm;
