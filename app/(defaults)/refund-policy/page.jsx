export default function RefundPolicyPage() {
  const companyName = "DIGITAL GYANI";
  const companyAddress = "B-2/181, B-Block, Near HDFC Bank ATM Yamuna Vihar, Delhi - 110053";
  const contactEmail = "aydigitalgyani@gmail.com";
  const lastUpdatedDate = "19 May 2025";

  return (
    <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 max-w-4xl">
        <header className="text-center mb-10 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Refund Policy
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {lastUpdatedDate}
          </p>
        </header>

        <div className="prose prose-lg lg:prose-xl dark:prose-invert max-w-none mx-auto">
          <p>
            This Refund Policy is issued by <strong>{companyName}</strong> for its exclusive platform – Digital Gyani Sarthi CRM. It explains when you can or cannot get a refund for purchases or subscriptions.
          </p>

          <h2>1. No Refund on Sarthi CRM Services</h2>
          <p>
            All payments made for Sarthi CRM (setup, access, training, support) are non-refundable. Once access is given, service is considered delivered. This includes:
          </p>
          <ul>
            <li>Dashboard or login access</li>
            <li>CRM setup or customization</li>
            <li>Training sessions (1-on-1 or group)</li>
            <li>Technical support or consultations</li>
            <li>Access to CRM tools and integrations</li>
          </ul>

          <h2>2. Exceptional Cases for Refund</h2>
          <p>
            Refunds may be given only in rare cases like:
          </p>
          <ul>
            <li>Duplicate payment due to technical error</li>
            <li>Wrong plan/double order reported within 24 hours (before CRM access starts)</li>
          </ul>
          <p>
            To request, email <a href={`mailto:${contactEmail}`}>{contactEmail}</a> within 24 hours with proof. Approval is at our sole discretion.
          </p>

          <h2>3. Subscription Services & Cancellations</h2>
          <ul>
            <li>You can cancel anytime to stop future billing</li>
            <li>No refund if you cancel during a billing cycle</li>
            <li>You will have access until your billing period ends</li>
            <li>No partial refunds for missed sessions or unused time</li>
          </ul>

          <h2>4. User Responsibilities</h2>
          <p>
            Users are advised to:
          </p>
          <ul>
            <li>Review demo or trial before purchase</li>
            <li>Ensure compatibility with their needs</li>
            <li>Join onboarding and use all features actively</li>
          </ul>
          <p>
            Inactivity or skipped sessions are not valid reasons for a refund.
          </p>

          <h2>5. Dispute & Support</h2>
          <p>
            For any issues, contact <a href={`mailto:${contactEmail}`}>{contactEmail}</a> before raising a dispute. We are here to help.
          </p>

          <h2>6. Agreement</h2>
          <p>
            By making payment, you confirm that you have read and accepted this refund policy.
          </p>

          <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
            <h2>Contact</h2>
            <p>
              For questions about this policy, contact:
            </p>
            <address className="not-italic mt-4 space-y-1">
              <p><strong>{companyName}</strong></p>
              <p>{companyAddress}</p>
              <p>Email: <a href={`mailto:${contactEmail}`}>{contactEmail}</a></p>
            </address>
          </div>
        </div>
      </div>
    </div>
  );
}
