import styles from '../styles/VideoCall.module.css';

export default function UserSelection({ onUserSelect }) {
  const developers = [
    { id: '5717c314-0ed1-4984-aa0d-4af6c961586e', name: '🔴 Dev 1', subtitle: 'Primary Tester', color: '#ff6b6b' },
    { id: '9a105e6f-ca83-4e09-ab83-46dfdfef112e', name: '🟢 Dev 2', subtitle: 'Secondary Tester', color: '#4ecdc4' },
    { id: '4d0ee74a-1dc0-4eeb-bee5-e7a46d1cc608', name: '🔵 Dev 3', subtitle: 'Group Call Host', color: '#45b7d1' },
    { id: 'd019cf14-a715-4d1d-b6b4-16c6d672874b', name: '🟡 Dev 4', subtitle: 'Mobile Simulator', color: '#96ceb4' },
  ];

  return (
    <div className={styles.userSelection}>
      <h3>👨‍💻 Select Your Developer Identity</h3>
      <div className={styles.devSelector}>
        {developers.map((dev) => (
          <button
            key={dev.id}
            onClick={() => onUserSelect(dev.id)}
            className={styles.button}
            style={{ 
              backgroundColor: dev.color,
              padding: '15px',
              fontSize: '16px',
              borderRadius: '8px',
              transition: 'transform 0.3s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '5px'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontWeight: 'bold' }}>{dev.name}</span>
            <small style={{ opacity: 0.8 }}>{dev.subtitle}</small>
          </button>
        ))}
      </div>
    </div>
  );
}