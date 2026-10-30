import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthShell from '../components/auth/AuthShell.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import { useAuthStore } from '../stores/auth.store.js';
import { getErrorMessage } from '../lib/utils.js';

export default function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.loading);

  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    try {
      await register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
      });
      toast.success('¡Cuenta creada! Bienvenido a SmartFinance AI');
      navigate('/', { replace: true });
    } catch (requestError) {
      const message = getErrorMessage(requestError, 'No se pudo crear la cuenta');
      setError(message);
      toast.error(message);
    }
  };

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Empieza a ordenar tus finanzas en menos de un minuto."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre completo"
          name="fullName"
          type="text"
          autoComplete="name"
          icon={User}
          placeholder="Carlos Ramírez"
          value={form.fullName}
          onChange={handleChange}
          required
        />

        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          icon={Mail}
          placeholder="tu@email.com"
          value={form.email}
          onChange={handleChange}
          required
        />

        <div className="relative">
          <Input
            label="Contraseña"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            icon={Lock}
            placeholder="Mínimo 8 caracteres"
            value={form.password}
            onChange={handleChange}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-3 top-[34px] rounded-md p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <Input
          label="Confirmar contraseña"
          name="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          icon={Lock}
          placeholder="Repite tu contraseña"
          value={form.confirmPassword}
          onChange={handleChange}
          required
        />

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" loading={loading} className="w-full">
          Crear cuenta
        </Button>

        <p className="text-center text-xs leading-relaxed text-slate-400">
          Al registrarte aceptas el uso de tus datos para generar análisis financieros. No compartas
          información sensible en el chat.
        </p>
      </form>
    </AuthShell>
  );
}
