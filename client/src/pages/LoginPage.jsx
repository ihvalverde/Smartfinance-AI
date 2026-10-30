import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthShell from '../components/auth/AuthShell.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import { useAuthStore } from '../stores/auth.store.js';
import { getErrorMessage } from '../lib/utils.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await login(form);
      toast.success('Bienvenido de vuelta');
      navigate('/', { replace: true });
    } catch (requestError) {
      const message = getErrorMessage(requestError, 'No se pudo iniciar sesión');
      setError(message);
      toast.error(message);
    }
  };

  return (
    <AuthShell
      title="Inicia sesión"
      subtitle="Accede a tu dashboard financiero y continúa donde lo dejaste."
      footer={
        <>
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
            Crea una gratis
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div>
          <div className="relative">
            <Input
              label="Contraseña"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              icon={Lock}
              placeholder="••••••••"
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
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" loading={loading} className="w-full">
          Entrar
        </Button>
      </form>

      <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50/70 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
        <div className="flex items-center gap-2 text-brand-700 dark:text-brand-300">
          <Sparkles className="h-4 w-4" />
          <p className="text-xs font-semibold">Cuenta de demostración</p>
        </div>
        <p className="mt-1.5 text-xs text-brand-800/80 dark:text-brand-200/80">
          Email: <span className="font-mono font-semibold">carlos@demo.com</span> · Contraseña:{' '}
          <span className="font-mono font-semibold">Demo1234!</span>
        </p>
      </div>
    </AuthShell>
  );
}
