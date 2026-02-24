export function VerificationCode({ code }: { code: string }) {
  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f5f7fb',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: '520px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
        }}
      >
        <h1 style={{ margin: '0 0 12px', color: '#1f2937' }}>
          Verification code
        </h1>
        <p style={{ margin: '0 0 16px', color: '#4b5563' }}>
          Use the code below to complete your action.
        </p>
        <div
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#111827',
            letterSpacing: '6px',
            textAlign: 'center',
            padding: '16px',
            borderRadius: '10px',
            backgroundColor: '#f3f4f6',
          }}
        >
          {code}
        </div>
        <p style={{ margin: '16px 0 0', color: '#6b7280', fontSize: '12px' }}>
          This code expires in 5 minutes. If you did not request this, please
          ignore this email.
        </p>
      </div>
    </div>
  );
}
