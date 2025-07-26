'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Loader, Modal, Text } from '@mantine/core';

const API_URI = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const UserCommentPage = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_URI}/api/contact/all`);
      setMessages(res.data);
    } catch (err) {
      console.error('❌ Failed to fetch contact messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const truncate = (str, limit = 40) => {
    return str.length > limit ? str.substring(0, limit) + '...' : str;
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">User Contact Submissions</h2>

      {loading ? (
        <Loader />
      ) : messages.length === 0 ? (
        <p className="text-gray-500">No messages found.</p>
      ) : (
        <Table striped highlightOnHover withBorder withColumnBorders>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Message</th>
              <th>Submitted At</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((msg, index) => (
              <tr key={msg.id}>
                <td>{index + 1}</td>
                <td>{msg.name}</td>
                <td>{msg.email}</td>
                <td>{msg.phone || '-'}</td>
                <td>
                  {msg.message.length > 40 ? (
                    <span
                      className="text-blue-600 cursor-pointer hover:underline"
                      onClick={() => {
                        setSelectedMessage(msg.message);
                        setModalOpen(true);
                      }}
                    >
                      {truncate(msg.message)} <strong>Read more</strong>
                    </span>
                  ) : (
                    msg.message
                  )}
                </td>
                <td>{new Date(msg.created_at).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Full Message"
        centered
      >
        <Text>{selectedMessage}</Text>
      </Modal>
    </div>
  );
};

export default UserCommentPage;