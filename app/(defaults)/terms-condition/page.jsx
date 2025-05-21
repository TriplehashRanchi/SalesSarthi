export default function TermsAndConditionsPage() {
  const companyName = "DIGITAL GYANI";
  const companyAddress = "B-2/181, B-Block, Near HDFC Bank ATM Yamuna Vihar, Delhi - 110053";
  const contactEmail = "aydigitalgyani@gmail.com";
  const lastUpdatedDate = "19 May 2025";

  return (
    <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 max-w-4xl">
        <header className="text-center mb-10 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Terms and Conditions
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {lastUpdatedDate}
          </p>
        </header>

        <div className="prose prose-lg lg:prose-xl dark:prose-invert max-w-none mx-auto">

          <p>Welcome to <strong>{companyName} Sarathi</strong>! By accessing our website or services, you agree to the terms described below. If you disagree, please do not use the website.</p>

          <h2>Terminology</h2>
          <ul>
            <li><strong>You/Your:</strong> the user of the website</li>
            <li><strong>We/Our/Us:</strong> refers to {companyName}</li>
            <li><strong>Parties:</strong> refers to both you and us</li>
          </ul>

          <h2>Cookies</h2>
          <p>We use cookies to improve your experience. By using our site, you agree to our use of cookies as described in the Privacy Policy.</p>

          <h2>Intellectual Property</h2>
          <p>All content on this site is owned by {companyName}. You may not republish, resell, copy, or redistribute our content without permission.</p>

          <h2>User Comments & Contributions</h2>
          <p>Users may post content, but we are not responsible for it. We may remove anything offensive or against our terms. You must have rights to post what you submit.</p>

          <h2>Linking to Our Website</h2>
          <p>You can link to our pages if it is not misleading, doesn't imply endorsement, and fits the linking context. We may ask you to remove the link anytime.</p>

          <h2>No Framing</h2>
          <p>You must not frame our pages in a way that changes their appearance without our written consent.</p>

          <h2>Content Responsibility</h2>
          <p>We are not responsible for content on external sites linking to us. You agree to protect us from any related claims.</p>

          <h2>Privacy</h2>
          <p>We respect your privacy. Please check our Privacy Policy to understand how we handle your personal data.</p>

          <h2>Changes & Updates</h2>
          <p>We may change these Terms anytime. Using the site after changes means you accept the updated terms.</p>

          <h2>Accuracy of Information</h2>
          <p>We try to keep info correct, but we do not guarantee it's complete or up to date.</p>

          <h2>Limitation of Liability</h2>
          <p>We are not liable for any damage from using our website, except where law does not allow limitations (like for personal injury or fraud).</p>

          <h2>Jurisdiction</h2>
          <p>These terms follow Indian law. Any legal disputes will be handled in Delhi courts.</p>

          <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
            <h2>Contact</h2>
            <p>If you have any questions about these terms, please contact us at:</p>
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

