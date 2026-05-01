import React from 'react';
export const AuthScreen = ({ onLogin }: any) => <div className="p-10 text-center">صفحة تسجيل الدخول - يرجى الضغط للبدء <button onClick={() => onLogin('CUSTOMER')} className="bg-orange-500 text-white p-2">دخول تجريبي</button></div>;
