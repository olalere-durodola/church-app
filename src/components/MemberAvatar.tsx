import { getInitials, getAvatarColor } from '../utils/avatarUtils';

interface MemberAvatarProps {
  photoURL?: string;
  firstName: string;
  lastName: string;
  size: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const SIZE_PX = { sm: 28, md: 40, lg: 64 } as const;

export default function MemberAvatar({ photoURL, firstName, lastName, size, onClick }: MemberAvatarProps) {
  const px = SIZE_PX[size];
  const style: React.CSSProperties = {
    width: px,
    height: px,
    borderRadius: '50%',
    flexShrink: 0,
    cursor: onClick ? 'pointer' : 'default',
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  if (photoURL) {
    return (
      <div style={style} onClick={onClick} className={onClick ? 'avatar-uploadable' : undefined}>
        <img
          src={photoURL}
          alt={`${firstName} ${lastName}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {onClick && <div className="avatar-camera-overlay">📷</div>}
      </div>
    );
  }

  return (
    <div
      style={{
        ...style,
        background: getAvatarColor(firstName, lastName),
        color: '#fff',
        fontWeight: 700,
        fontSize: px * 0.38,
        letterSpacing: '-0.02em',
      }}
      onClick={onClick}
      className={onClick ? 'avatar-uploadable' : undefined}
    >
      {getInitials(firstName, lastName)}
      {onClick && <div className="avatar-camera-overlay">📷</div>}
    </div>
  );
}
