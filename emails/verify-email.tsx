import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface VerifyEmailProps {
  email: string;
  verificationLink: string;
  token: string;
}

export const VerifyEmail: React.FC<Readonly<VerifyEmailProps>> = ({
  email,
  verificationLink,
  token,
}) => (
  <Html>
    <Head />
    <Preview>Verify your email</Preview>
    <Body style={main as any}>
      <Container style={container as any}>
        <Section style={box as any}>
          <Heading style={heading as any}>Welcome 🚀</Heading>
          <Text style={paragraph as any}>
            Thank you for signing up! Please verify your email address to get started.
          </Text>
          
          <Section style={buttonContainer as any}>
            <Button style={button as any} href={verificationLink}>
              Verify Email Address
            </Button>
          </Section>
          
          <Text style={paragraph as any}>
            Or copy and paste this link in your browser:
          </Text>
          <Link style={link as any} href={verificationLink}>
            {verificationLink}
          </Link>
          
          <Text style={paragraph as any}>
            This link will expire in 24 hours.
          </Text>
          
          <Section style={footer as any}>
            <Text style={footerText as any}>
              If you didn't sign up for ......, you can ignore this email.
            </Text>
            <Text style={footerText as any}>
              © All rights reserved.
            </Text>
          </Section>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default VerifyEmail;

const main = {
  backgroundColor: '#f9fafb',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '580px',
};

const box = {
  padding: '48px 40px',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
};

const heading = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '700',
  lineHeight: '1.3',
  margin: '0 0 24px',
};

const paragraph = {
  color: '#4b5563',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const buttonContainer = {
  padding: '24px 0',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: '600',
  padding: '12px 20px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
};

const link = {
  color: '#2563eb',
  fontSize: '12px',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
};

const footer = {
  padding: '24px 0',
  borderTop: '1px solid #e5e7eb',
  marginTop: '24px',
};

const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '1.6',
  margin: '0 0 8px',
};