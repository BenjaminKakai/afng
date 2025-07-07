import styles from '../styles/VideoCall.module.css';

export default function UserSelection({ onUserSelect }) {
  const developers = [
    { 
      id: 'Dev 1', 
      name: '🔴 Dev 1', 
      subtitle: 'Primary Tester', 
      color: '#ff6b6b' 
    },
    { 
      id: 'Dev 2', 
      name: '🟢 Dev 2', 
      subtitle: 'Secondary Tester', 
      color: '#4ecdc4' 
    },
    { 
      id: 'Dev 3', 
      name: '🔵 Dev 3', 
      subtitle: 'Group Call Host', 
      color: '#45b7d1' 
    },
    { 
      id: 'Dev 4', 
      name: '🟡 Dev 4', 
      subtitle: 'Mobile Simulator', 
      color: '#96ceb4' 
    }
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