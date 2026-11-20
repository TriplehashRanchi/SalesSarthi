'use client';
import { Badge, Button, Modal, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconAlertTriangle, IconCopy, IconExternalLink, IconPlus } from '@tabler/icons-react';

// Shown when a new customer (add form, lead conversion) has the same phone or email as saved customers.
// Nothing is saved until the person picks one of two plain choices:
//   • "Yes, same person" → the product is added to that saved customer (nothing on it is overwritten);
//   • "Save separately"  → saved as its own record and listed in Duplicate Customers, to merge later.
// duplicate: the 409 body from the API ({ matches, can_create_new, is_admin }).
export default function DuplicateCustomerModal({ duplicate, onClose, onAddToExisting, onCreateNew, profilePath = (id) => `/view-customer/${id}`, busy = false }) {
  const isPhone = useMediaQuery('(max-width: 639px)');
  const matches = duplicate?.matches || [];
  const one = matches.length === 1;

  return (
    <Modal opened={!!duplicate} onClose={onClose} title="This customer may already be saved" centered size="lg" fullScreen={isPhone}>
      <div className="mb-4 flex gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
        <IconAlertTriangle size={18} className="mt-0.5 shrink-0" />
        <span>
          {one ? 'A saved customer has' : `${matches.length} saved customers have`} the same phone number or email.{' '}
          <b>Nothing is saved yet.</b>
        </span>
      </div>

      <Text weight={600} mb={6}>Is this the same person?</Text>

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
                {(m.product_name || m.policy_number) && <div>Product: {[m.product_name, m.policy_number].filter(Boolean).join(' · ')}</div>}
                {m.folders?.length > 0 && <div>Product lines: {m.folders.join(', ')}</div>}
                {m.assigned_to_name && <div>Assigned to: {m.assigned_to_name}</div>}
              </div>
            ) : (
              <Text size="sm" color="dimmed" mt={4}>{m.note || 'This customer is handled by another team member.'}</Text>
            )}

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              {m.can_add_product && (
                <Button size="sm" color="blue" leftIcon={<IconPlus size={16} />} loading={busy} onClick={() => onAddToExisting(m.id)} className="w-full sm:w-auto">
                  Yes, same person: add to this customer
                </Button>
              )}
              {m.can_open && (
                <Button size="sm" variant="subtle" color="gray" leftIcon={<IconExternalLink size={16} />} onClick={() => window.open(profilePath(m.id), '_blank', 'noopener')} className="w-full sm:w-auto">
                  Open profile
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {duplicate?.can_create_new ? (
        <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-3 dark:border-gray-600">
          <Text weight={600} size="sm">No, or not sure?</Text>
          <Text size="sm" color="dimmed" mb="sm">
            Save it as a separate customer. It will be listed in <b>Duplicate Customers</b>, where
            {duplicate.is_admin ? ' you can' : ' your admin can'} compare both records and merge them later.
          </Text>
          <Button variant="outline" color="dark" leftIcon={<IconCopy size={16} />} loading={busy} onClick={onCreateNew} className="w-full sm:w-auto">
            Save separately, review later
          </Button>
        </div>
      ) : (
        !matches.some((m) => m.can_add_product) && (
          <Text size="sm" color="dimmed" mt="md">Please ask your admin to add this product to the existing customer.</Text>
        )
      )}

      <div className="mt-4 flex sm:justify-end">
        <Button variant="default" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
      </div>
    </Modal>
  );
}
