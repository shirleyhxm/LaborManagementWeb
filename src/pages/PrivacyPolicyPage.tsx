import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';

export function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-neutral-500 mb-8">
            Last Updated: February 19, 2026
          </p>

          <div className="prose prose-neutral max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                1. Introduction
              </h2>
              <p className="text-neutral-700 mb-4">
                OptimalAssign ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our labor scheduling and workforce management platform.
              </p>
              <p className="text-neutral-700 mb-4">
                Please read this Privacy Policy carefully. By using the Service, you agree to the collection and use of information in accordance with this policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                2. Information We Collect
              </h2>

              <h3 className="text-xl font-semibold text-neutral-900 mb-3 mt-6">
                2.1 Personal Information
              </h3>
              <p className="text-neutral-700 mb-4">
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 text-neutral-700 mb-4">
                <li>Account information (name, email address, username, password)</li>
                <li>Profile information (job title, department, role)</li>
                <li>Employee data entered into the system (names, availability, skills, wage information)</li>
                <li>Schedule and shift information</li>
                <li>Communications with us</li>
              </ul>

              <h3 className="text-xl font-semibold text-neutral-900 mb-3 mt-6">
                2.2 Automatically Collected Information
              </h3>
              <p className="text-neutral-700 mb-4">
                When you access our Service, we automatically collect certain information, including:
              </p>
              <ul className="list-disc pl-6 text-neutral-700 mb-4">
                <li>Log data (IP address, browser type, pages visited, time spent)</li>
                <li>Device information (device type, operating system)</li>
                <li>Usage data (features used, actions taken)</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                3. How We Use Your Information
              </h2>
              <p className="text-neutral-700 mb-4">
                We use the collected information for the following purposes:
              </p>
              <ul className="list-disc pl-6 text-neutral-700 mb-4">
                <li>To provide, maintain, and improve the Service</li>
                <li>To process and complete transactions</li>
                <li>To create and manage employee schedules</li>
                <li>To send you technical notices, updates, and support messages</li>
                <li>To respond to your comments and questions</li>
                <li>To monitor and analyze usage and trends</li>
                <li>To detect, prevent, and address technical issues and security threats</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                4. Data Sharing and Disclosure
              </h2>
              <p className="text-neutral-700 mb-4">
                We may share your information in the following situations:
              </p>

              <h3 className="text-xl font-semibold text-neutral-900 mb-3 mt-6">
                4.1 With Your Organization
              </h3>
              <p className="text-neutral-700 mb-4">
                Information you enter into the Service is accessible to authorized users within your organization (e.g., managers, administrators).
              </p>

              <h3 className="text-xl font-semibold text-neutral-900 mb-3 mt-6">
                4.2 Service Providers
              </h3>
              <p className="text-neutral-700 mb-4">
                We may share your information with third-party service providers who perform services on our behalf, such as hosting, data analysis, customer service, and email delivery. These providers are bound by confidentiality agreements.
              </p>

              <h3 className="text-xl font-semibold text-neutral-900 mb-3 mt-6">
                4.3 Legal Requirements
              </h3>
              <p className="text-neutral-700 mb-4">
                We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., court orders, government agencies).
              </p>

              <h3 className="text-xl font-semibold text-neutral-900 mb-3 mt-6">
                4.4 Business Transfers
              </h3>
              <p className="text-neutral-700 mb-4">
                In connection with any merger, sale of company assets, financing, or acquisition, your information may be transferred to the new entity.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                5. Data Security
              </h2>
              <p className="text-neutral-700 mb-4">
                We implement appropriate technical and organizational security measures to protect your information, including:
              </p>
              <ul className="list-disc pl-6 text-neutral-700 mb-4">
                <li>Encryption of data in transit using SSL/TLS</li>
                <li>Secure authentication mechanisms</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication requirements</li>
                <li>Employee training on data protection</li>
              </ul>
              <p className="text-neutral-700 mb-4">
                However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee its absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                6. Data Retention
              </h2>
              <p className="text-neutral-700 mb-4">
                We retain your information for as long as necessary to provide the Service and fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. When we no longer need your information, we will securely delete or anonymize it.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                7. Your Rights and Choices
              </h2>
              <p className="text-neutral-700 mb-4">
                Depending on your location, you may have certain rights regarding your personal information:
              </p>
              <ul className="list-disc pl-6 text-neutral-700 mb-4">
                <li><strong>Access:</strong> Request access to the personal information we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Portability:</strong> Request a copy of your data in a structured, machine-readable format</li>
                <li><strong>Objection:</strong> Object to the processing of your information</li>
                <li><strong>Restriction:</strong> Request restriction of processing of your information</li>
              </ul>
              <p className="text-neutral-700 mb-4">
                To exercise these rights, please contact us at the email address provided below.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                8. Cookies and Tracking Technologies
              </h2>
              <p className="text-neutral-700 mb-4">
                We use cookies and similar tracking technologies to track activity on our Service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                9. International Data Transfers
              </h2>
              <p className="text-neutral-700 mb-4">
                Your information may be transferred to and maintained on computers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ. We will take appropriate steps to ensure that your data is treated securely and in accordance with this Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                10. Children's Privacy
              </h2>
              <p className="text-neutral-700 mb-4">
                Our Service is not intended for use by children under the age of 16. We do not knowingly collect personal information from children under 16. If you become aware that a child has provided us with personal information, please contact us.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                11. Changes to This Privacy Policy
              </h2>
              <p className="text-neutral-700 mb-4">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                12. Contact Us
              </h2>
              <p className="text-neutral-700 mb-4">
                If you have any questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <p className="text-neutral-700 font-mono mb-2">
                Email: privacy@optimalassign.com
              </p>
              <p className="text-neutral-700 font-mono">
                Support: support@optimalassign.com
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
