import React from 'react';
import { Badge, Button, Menu, Select } from '@mantine/core';
import { IconChatDot, IconPencil, IconPhoneCall } from '@tabler/icons-react';

export default function MobileLeadList({
  recordsData = [],
  selectedLeads = [],
  setSelectedLeads,
  teamMembers = [],
  assignLeads,
  deleteLeads,
  selectedTeamMember,
  setSelectedTM,
  statusOptions = [],
  updateLeadStatus,
  router,
  convertLeadToCustomer,
  setNoteEditor,
  setPayloadViewer,
  setSelectedLead,
  setShowDrawer,
  fetchFollowupHistory,
}) {
  return (
    <div className="md:hidden flex flex-col gap-4">
      {recordsData.map((record) => {
        const isSelected = selectedLeads.includes(record.id);
        const u = teamMembers.find((t) => t.id === record.user_id);

        return (
          <div
            key={record.id}
            className="bg-white dark:bg-gray-800 shadow rounded-md p-4 text-sm flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold">{record.full_name}</div>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() =>
                  setSelectedLeads((prev) =>
                    isSelected ? prev.filter((id) => id !== record.id) : [...prev, record.id]
                  )
                }
              />
            </div>

            <div>📞 {record.phone_number}</div>

            <div className="flex items-center gap-2">
              <span>Status:</span>
              <Menu withinPortal shadow="md" position="bottom-start">
                <Menu.Target>
                  <Badge color="blue" className="cursor-pointer">
                    {record.lead_status || 'Select'}
                  </Badge>
                </Menu.Target>
                <Menu.Dropdown>
                  {statusOptions.map((o) => (
                    <Menu.Item
                      key={o.value}
                      onClick={() => updateLeadStatus(record, o.value)}
                    >
                      {o.label}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <Button size="xs" onClick={() => router.push(`/editlead/${record.id}`)}>
                <IconPencil size={14} /> Edit
              </Button>

              <Button
                size="xs"
                onClick={() => {
                  const digits = (record.phone_number || '').replace(/\D/g, '');
                  const tenDigitNumber = digits.length === 12 && digits.startsWith('91')
                    ? digits.slice(2)
                    : digits.length === 10
                    ? digits
                    : null;

                  if (tenDigitNumber && /^[6-9]\d{9}$/.test(tenDigitNumber)) {
                    window.open(`https://wa.me/91${tenDigitNumber}?text=Hello ${record.full_name},`, '_blank');
                  } else {
                    alert('Invalid phone number');
                  }
                }}
              >
                <IconChatDot size={14} /> WhatsApp
              </Button>

              <Button size="xs" onClick={() => {
                setSelectedLead(record);
                setShowDrawer(true);
                fetchFollowupHistory(record.id);
              }}>
                <IconPhoneCall size={14} /> Follow-ups
              </Button>

              <Button
                size="xs"
                variant="light"
                onClick={() => convertLeadToCustomer(record)}
              >
                Convert
              </Button>
            </div>

            <div className="text-xs text-gray-400">Assigned to: {u ? u.username : '—'}</div>
          </div>
        );
      })}

      {/* Assign & Delete Controls */}
      {selectedLeads.length > 0 && (
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 py-3 px-4 shadow-inner flex flex-col gap-2">
          <Select
            data={teamMembers.map((u) => ({
              value: u.id.toString(),
              label: `${u.username} (${u.role})`,
            }))}
            value={selectedTeamMember}
            onChange={setSelectedTM}
            placeholder="Assign selected to..."
            searchable
            clearable
          />

          <div className="flex gap-2">
            <Button
              onClick={assignLeads}
              disabled={!selectedTeamMember || !selectedLeads.length}
              className="flex-1"
            >
              Assign ({selectedLeads.length})
            </Button>
            <Button
              onClick={deleteLeads}
              disabled={!selectedLeads.length}
              color="red"
              variant="outline"
              className="flex-1"
            >
              Delete ({selectedLeads.length})
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};


