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
import TemplateForm from './TemplateForm'; // Your updated template form component

const preDefinedCategories = [
  { value: 'nurturing', label: 'Nurturing (New Lead)' },
  { value: 'appointment', label: 'Appointment Reminder' },
  { value: 'birthday', label: 'Birthday Wish' },
  { value: 'anniversary', label: 'Anniversary Wish' },
  { value: 'renewal', label: 'Policy Renewal' },
];

const TemplateManagementPage = () => {
  const [templates, setTemplates] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
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
          showNotification({
            title: 'Error',
            message: 'You must be logged in to view templates',
            color: 'red',
          });
          return;
        }
        const idToken = await user.getIdToken();
        setToken(idToken);
        const res = await axios.get(`${API_URL}/api/templates`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
        });
        setTemplates(res.data);
      } catch (error) {
        console.error('Error fetching templates:', error);
        showNotification({
          title: 'Error',
          message: 'Failed to fetch templates',
          color: 'red',
        });
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
    setActiveCategory(category);
    setActiveTemplate(foundTemplate || null);
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
      message: `Template for ${savedTemplate.category} ${
        isEditing ? 'updated' : 'created'
      } successfully`,
      color: 'green',
    });
    setModalOpened(false);
  };

  return (
    <Box p="md">
      <Title order={2} mb="md">
        Template Management
      </Title>

      {loading ? (
        <Loader />
      ) : (
        preDefinedCategories.map((category) => {
          const template = templates.find(
            (t) => t.category === category.value
          );
          return (
            <Card key={category.value} shadow="sm" mb="sm" withBorder>
              <Group position="apart" mb="xs">
                <Text weight={500}>{category.label}</Text>
                <Button
                  variant="light"
                  size="xs"
                  onClick={() => handleEditCategory(category)}
                >
                  {template ? 'Edit Template' : 'Create Template'}
                </Button>
              </Group>
              {template ? (
                <>
                  <Text size="sm" mb="md" style={{ whiteSpace: 'pre-wrap' }}>
                    {template.template_message}
                  </Text>
                  <Text size="xs" color="dimmed">
                    Template ID: {template.id}
                  </Text>
                </>
              ) : (
                <Text size="sm" color="dimmed">
                  No template created. Please create one.
                </Text>
              )}
            </Card>
          );
        })
      )}

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={`${
          activeTemplate ? 'Edit Template for ' : 'Create Template for '
        }${activeCategory ? activeCategory.label : ''}`}
      >
        {/* Pass the token to TemplateForm so it can attach it to its requests */}
        <TemplateForm
          initialData={activeTemplate}
          category={activeCategory?.value || ''}
          onSave={handleSaveTemplate}
          token={token} 
          apiUrl={API_URL}
        />
      </Modal>
    </Box>
  );
};

export default TemplateManagementPage;
