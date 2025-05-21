// app/privacy-policy/page.js

export default function PrivacyPolicyPage() {
  const companyName = "DIGITAL GYANI";
  const companyAddress = "B-2/181, B-Block, Near HDFC Bank ATM Yamuna Vihar, Delhi - 110053";
  const contactEmail = "aydigitalgyani@gmail.com";
  // To match the image's date format "19 May 2025"
  const lastUpdatedDate = "19 May 2025"; // Or use new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); for dynamic

  return (
    <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 max-w-4xl"> {/* max-w-4xl or max-w-5xl can be adjusted */}
        
        <header className="text-center mb-10 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {lastUpdatedDate}
          </p>
        </header>

        <div className="prose prose-lg lg:prose-xl dark:prose-invert max-w-none mx-auto">
          {/* 
            The `prose` classes from @tailwindcss/typography will handle styling for
            p, h2, ul, strong, a, etc. to match common document styles.
          */}
          
          <p>
            This Privacy Policy is prepared by <strong>{companyName}</strong> and whose registered address is {companyAddress} (“We”, “Us”, “Our”) are committed to protecting and preserving the privacy of our visitors when visiting our site or communicating electronically with us.
          </p>
          <p>
            This policy sets out how we process any personal data we collect from you or that you provide to us through our website and social media sites. We confirm that we will keep your information secure and comply fully with all applicable INDIA Data Protection legislation and regulations. Please read the following carefully to understand what happens to personal data that you choose to provide to us, or that we collect from you when you visit our sites. By submitting information you are accepting and consenting to the practices described in this policy.
          </p>

          <h2>Types of information we may collect from you</h2>
          <p>
            We may collect, store and use the following kinds of personal information about individuals who visit and use our website and social media sites:
          </p>
          <p>
            <strong>Information you supply to us.</strong> You may supply us with information about you by filling in forms on our website or social media. This includes information you provide when you submit a contact/inquiry form. The information you give us may include but is not limited to, your name, address, e-mail address, and phone number.
          </p>

          <h2>How we may use the information we collect</h2>
          <p>
            We use the information in the following ways:
          </p>
          <p>
            <strong>Information you supply to us.</strong> We will use this information:
          </p>
          <ul>
            <li>to provide you with information and/or services that you request from us;</li>
            <li>To contact you to provide the information requested.</li>
          </ul>

          <h2>Disclosure of your information</h2>
          <p>
            Any information you provide to us will either be emailed directly to us or may be stored on a secure server.
          </p>
          <p>
            We do not rent, sell or share personal information about you with other people or non-affiliated companies.
          </p>
          <p>
            We will use all reasonable efforts to ensure that your personal data is not disclosed to regional/national institutions and authorities unless required by law or other regulations.
          </p>
          <p>
            Unfortunately, the transmission of information via the internet is not completely secure. Although we will do our best to protect your personal data, we cannot guarantee the security of your data transmitted to our site; any transmission is at your own risk. Once we have received your information, we will use strict procedures and security features to try to prevent unauthorized access.
          </p>

          <h2>Your rights – access to your personal data</h2>
          <p>
            You have the right to ensure that your personal data is being processed lawfully (“Subject Access Right”). Your subject access right can be exercised in accordance with data protection laws and regulations. Any subject access request must be made in writing to <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. We will provide your personal data to you within the statutory time frames. To enable us to trace any of your personal data that we may be holding, we may need to request further information from you. If you complain about how we have used your information, you have the right to complain to the Information Commissioner’s Office (ICO).
          </p>

          <h2>Changes to our privacy policy</h2>
          <p>
            Any changes we may make to our privacy policy in the future will be posted on this page and, where appropriate, notified to you by email. Please check back frequently to see any updates or changes to our privacy policy.
          </p>

          <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
            <h2>Contact</h2>
            <p>
              Questions, comments, and requests regarding this privacy policy are welcomed and should be addressed to:
            </p>
            <address className="not-italic mt-4 space-y-1"> {/* Reduced space-y */}
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