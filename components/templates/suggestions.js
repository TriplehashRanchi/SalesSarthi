// Ready-made messages the editor offers as a starting point. Keyed by topic; a reminder type picks the topic
// that matches its date rule (see suggestionsFor).
export const suggestionsByTopic = {
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

const TOPIC_BY_DATE_FIELD = { created_at: 'nurturing', date_of_birth: 'birthday', anniversary: 'anniversary', renewal_date: 'renewal' };

// Manual types (no date rule) get the appointment-style messages.
export const suggestionsFor = (dateField) => suggestionsByTopic[TOPIC_BY_DATE_FIELD[dateField] || 'appointment'] || [];
