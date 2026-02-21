import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';

export function TermsOfServicePage() {
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
            Terms of Service
          </h1>
          <p className="text-sm text-neutral-500 mb-8">
            Last Updated: February 19, 2026
          </p>

          <div className="prose prose-neutral max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-neutral-700 mb-4">
                By accessing and using OptimalAssign ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                2. Description of Service
              </h2>
              <p className="text-neutral-700 mb-4">
                OptimalAssign provides a web-based labor scheduling and workforce management platform ("the Service") that enables organizations to create, manage, and optimize employee schedules. The Service includes but is not limited to:
              </p>
              <ul className="list-disc pl-6 text-neutral-700 mb-4">
                <li>Schedule generation and optimization</li>
                <li>Employee management</li>
                <li>Labor forecasting</li>
                <li>Constraint and rules management</li>
                <li>Analytics and reporting</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                3. User Accounts and Responsibilities
              </h2>
              <p className="text-neutral-700 mb-4">
                To use the Service, you must register for an account. You agree to:
              </p>
              <ul className="list-disc pl-6 text-neutral-700 mb-4">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain the security of your password and account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Accept responsibility for all activities that occur under your account</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                4. Acceptable Use Policy
              </h2>
              <p className="text-neutral-700 mb-4">
                You agree not to use the Service to:
              </p>
              <ul className="list-disc pl-6 text-neutral-700 mb-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon the rights of others</li>
                <li>Distribute malware or other harmful code</li>
                <li>Attempt to gain unauthorized access to the Service or related systems</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Use the Service for any illegal or unauthorized purpose</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                5. Intellectual Property Rights
              </h2>
              <p className="text-neutral-700 mb-4">
                The Service and its original content, features, and functionality are owned by OptimalAssign and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
              <p className="text-neutral-700 mb-4">
                You retain ownership of any data you input into the Service. By using the Service, you grant us a license to use, store, and process your data solely for the purpose of providing the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                6. Data Protection and Privacy
              </h2>
              <p className="text-neutral-700 mb-4">
                Your use of the Service is also governed by our Privacy Policy. Please review our Privacy Policy to understand our practices.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                7. Service Availability
              </h2>
              <p className="text-neutral-700 mb-4">
                We strive to provide continuous access to the Service, but we do not guarantee that the Service will be available at all times. We reserve the right to modify, suspend, or discontinue the Service at any time without notice.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                8. Limitation of Liability
              </h2>
              <p className="text-neutral-700 mb-4">
                To the maximum extent permitted by law, OptimalAssign shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from:
              </p>
              <ul className="list-disc pl-6 text-neutral-700 mb-4">
                <li>Your use or inability to use the Service</li>
                <li>Any unauthorized access to or use of our servers and/or any personal information stored therein</li>
                <li>Any interruption or cessation of transmission to or from the Service</li>
                <li>Any bugs, viruses, or other harmful code transmitted through the Service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                9. Indemnification
              </h2>
              <p className="text-neutral-700 mb-4">
                You agree to indemnify and hold harmless OptimalAssign and its affiliates, officers, agents, and employees from any claim, demand, or damage, including reasonable attorneys' fees, arising out of your use of the Service or violation of these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                10. Modifications to Terms
              </h2>
              <p className="text-neutral-700 mb-4">
                We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the new Terms on this page and updating the "Last Updated" date. Your continued use of the Service after such modifications constitutes your acceptance of the new Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                11. Termination
              </h2>
              <p className="text-neutral-700 mb-4">
                We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including without limitation if you breach these Terms. Upon termination, your right to use the Service will immediately cease.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                12. Governing Law
              </h2>
              <p className="text-neutral-700 mb-4">
                These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which OptimalAssign operates, without regard to its conflict of law provisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
                13. Contact Information
              </h2>
              <p className="text-neutral-700 mb-4">
                If you have any questions about these Terms, please contact us at:
              </p>
              <p className="text-neutral-700 font-mono">
                support@optimalassign.com
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
