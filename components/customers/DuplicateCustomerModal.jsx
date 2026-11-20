'use client';
import { Badge, Button, Group, Modal, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconAlertTriangle, IconExternalLink, IconPlus, IconUserPlus } from '@tabler/icons-react';

// Shown when a new customer (add form, lead conversion) has the same phone or email as saved customers.
// Nothing is saved until the user picks: add to one of the matches, or (admins) save as a new customer.
// duplicate: the 409 body from the API ({ matches, can_create_new }).
export default function DuplicateCustomerModal({ duplicate, onClose, onAddToExisting, onCreateNew, profilePath = (id) => `/view-customer/${id}`, busy = false }) {
  const isPhone = useMediaQuery('(max-width: 639px)');
  const matches = duplicate?.matches || [];

  return (
    <Modal opened={!!duplicate} onClose={onClose} title="This customer may already exist" centered size="lg" fullScreen={isPhone}>
      <div className="mb-4 flex gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
        <IconAlertTriangle size={18} className="mt-0.5 shrink-0" />
        <span>
          {matches.length === 1 ? 'A saved customer has' : `${matches.length} saved customers have`} the same phone number or email. Nothing has been saved yet. If it is the same person, add
          this product to their profile. Their saved details are not changed.
        </span>
      </div>

      <div className="space-y-3">
        {matches.map((m) => (
          <div key={m.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-2">
              <Text weight={600} className="min-w-0 break-words">{m.full_name || 'No name'}</Text>
              {(m.matched_on || []).map((k) => (
                <Badge key={k} size="xs" color="orange" variant="light">Same {k}</Badge>
              ))}
            </div>

            {m.can_open ? (
              <div className="mt-1 space-y-0.5 text-sm text-gray-600 dark:text-gray-400">
                {m.phone_number && <div>{m.phone_number}</div>}
                {m.email && <div className="break-all">{m.email}</div>}
                {(m.product_name || m.policy_number) && (
                  <div>Product: {[m.product_name, m.policy_number].filter(Boolean).join(' · ')}</div>
                )}
                {m.folders?.length > 0 && <div>Product lines: {m.folders.join(', ')}</div>}
                {m.assigned_to_name && <div>Assigned to: {m.assigned_to_name}</div>}
              </div>
            ) : (
              <Text size="sm" color="dimmed" mt={4}>{m.note || 'This customer is handled by another team member.'}</Text>
            )}

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              {m.can_add_product && (
                <Button size="sm" color="blue" leftIcon={<IconPlus size={16} />} loading={busy} onClick={() => onAddToExisting(m.id)} className="w-full sm:w-auto">
                  Add to this customer
                </Button>
              )}
              {m.can_open && (
                <Button
                  size="sm"
                  variant="light"
                  color="gray"
                  leftIcon={<IconExternalLink size={16} />}
                  onClick={() => window.open(profilePath(m.id), '_blank', 'noopener')}
                  className="w-full sm:w-auto"
                >
                  Open profile
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {!matches.some((m) => m.can_add_product) && !duplicate?.can_create_new && (
        <Text size="sm" color="dimmed" mt="md">Please ask your admin to add this product to the existing customer.</Text>
      )}

      <Group position="apart" mt="lg" className="flex-col-reverse gap-2 sm:flex-row">
        <Button variant="default" onClick={onClose} className="w-full sm:w-auto">
          Go back
        </Button>
        {duplicate?.can_create_new && (
          <Button variant="outline" color="dark" leftIcon={<IconUserPlus size={16} />} loading={busy} onClick={onCreateNew} className="w-full sm:w-auto">
            It&apos;s a different person, save as new
          </Button>
        )}
      </Group>
    </Modal>
  );
}
