export const generatePassword = (): string => {
    const length = 6;
    const charset = '0123456789'; // Only numbers
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };