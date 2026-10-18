import { Head, Link, useForm } from '@inertiajs/react';
import { useId, useRef, useState } from 'react';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
import '../../../css/login.css';

const FIELD_ORDER = ['email', 'password'];

const REQUIRED_MESSAGES = {
    email: 'Enter your email address.',
    password: 'Enter your password.',
};

const ORBIT_DOTS = [
    { angle: '18deg', radius: '210px', size: '8px', red: true },
    { angle: '72deg', radius: '210px', size: '6px', red: false },
    { angle: '138deg', radius: '210px', size: '6px', red: true },
    { angle: '196deg', radius: '214px', size: '10px', red: false },
    { angle: '248deg', radius: '206px', size: '4px', red: false },
    { angle: '302deg', radius: '210px', size: '7px', red: true },
    { angle: '338deg', radius: '220px', size: '5px', red: false },
];

/**
 * Turn Fortify's credential error into the page's copy, but keep the
 * throttle message so users know how long to wait.
 *
 * @param {string | undefined} message
 * @returns {string | null}
 */
function loginFailureMessage(message) {
    if (!message) {
        return null;
    }

    return message.startsWith('Too many')
        ? message
        : 'Email or password is incorrect.';
}

/**
 * @param {{
 *   status?: string,
 *   canResetPassword?: boolean,
 *   canRegister?: boolean,
 *   demoAccounts?: Array<{ label: string, email: string, password: string }>,
 * }} props
 */
export default function LoginPage({
    status,
    canResetPassword = true,
    canRegister = true,
    demoAccounts = [],
}) {
    const idPrefix = useId();
    const fieldIds = {
        email: `${idPrefix}-email`,
        password: `${idPrefix}-password`,
    };
    const inputRefs = {
        email: useRef(null),
        password: useRef(null),
    };

    const [clientErrors, setClientErrors] = useState({});
    const form = useForm({ email: '', password: '' });
    const failureMessage = loginFailureMessage(form.errors.email);

    function updateField(field, value) {
        form.setData(field, value);
        form.clearErrors();

        if (clientErrors[field] && value.trim() !== '') {
            setClientErrors((current) => ({ ...current, [field]: undefined }));
        }
    }

    function quickFill(account) {
        form.setData({
            email: account.email,
            password: account.password,
        });
        form.clearErrors();
        setClientErrors({});
    }

    function handleSubmit(event) {
        event.preventDefault();

        const nextErrors = {};

        for (const field of FIELD_ORDER) {
            if (form.data[field].trim() === '') {
                nextErrors[field] = REQUIRED_MESSAGES[field];
            }
        }

        setClientErrors(nextErrors);

        const firstInvalidField = FIELD_ORDER.find(
            (field) => nextErrors[field],
        );

        if (firstInvalidField) {
            inputRefs[firstInvalidField].current?.focus();

            return;
        }

        form.submit(store(), { onFinish: () => form.reset('password') });
    }

    function fieldA11yProps(field) {
        const errorId = `${fieldIds[field]}-error`;

        return {
            id: fieldIds[field],
            ref: inputRefs[field],
            required: true,
            'aria-required': true,
            'aria-invalid': clientErrors[field] ? true : undefined,
            'aria-describedby': clientErrors[field] ? errorId : undefined,
        };
    }

    function renderFieldError(field) {
        if (!clientErrors[field]) {
            return null;
        }

        return (
            <p id={`${fieldIds[field]}-error`} className="cg-login__error">
                {clientErrors[field]}
            </p>
        );
    }

    function renderLabel(field, text) {
        return (
            <label htmlFor={fieldIds[field]} className="cg-login__label">
                {text}
                <span className="cg-login__required" aria-hidden="true">
                    *
                </span>
            </label>
        );
    }

    return (
        <div className="cg-login">
            <Head title="Sign in" />

            <div className="cg-login__brand" aria-hidden="true">
                <div className="cg-login__logo">
                    <img
                        className="cg-login__logo-mark"
                        src="/logo-mark.svg"
                        alt=""
                        width="52"
                        height="41"
                    />
                    <p className="cg-login__wordmark">
                        <span>Confidence</span>
                        <span>
                            Gl
                            <span className="cg-login__wordmark-accent">o</span>
                            bal
                        </span>
                        <span>Education</span>
                    </p>
                </div>

                <div className="cg-login__hero">
                    <div className="cg-login__glow" />
                    <div className="cg-login__orbit">
                        {ORBIT_DOTS.map((dot) => (
                            <span
                                key={dot.angle}
                                className={
                                    dot.red
                                        ? 'cg-login__dot cg-login__dot--red'
                                        : 'cg-login__dot'
                                }
                                style={{
                                    '--angle': dot.angle,
                                    '--radius': dot.radius,
                                    '--size': dot.size,
                                }}
                            />
                        ))}
                    </div>
                    <img
                        className="cg-login__hero-image"
                        src="/hero-cap.svg"
                        alt=""
                        width="420"
                        height="331"
                    />
                </div>
            </div>

            <main className="cg-login__panel">
                <div className="cg-login__column">
                    <img
                        className="cg-login__mobile-logo"
                        src="/logo-mark.svg"
                        alt="Confidence Global Education"
                        width="44"
                        height="35"
                    />

                    <h1 className="cg-login__title">Welcome back</h1>
                    <p className="cg-login__subtitle">
                        Sign in to your agency workspace.
                    </p>

                    {status && (
                        <p className="cg-login__status" role="status">
                            {status}
                        </p>
                    )}

                    <form
                        className="cg-login__form"
                        onSubmit={handleSubmit}
                        noValidate
                    >
                        <div className="cg-login__field">
                            {renderLabel('email', 'Email')}
                            <div
                                className="cg-login__control"
                                data-invalid={Boolean(clientErrors.email)}
                            >
                                <input
                                    {...fieldA11yProps('email')}
                                    className="cg-login__input"
                                    type="email"
                                    name="email"
                                    autoComplete="username"
                                    autoFocus
                                    value={form.data.email}
                                    onChange={(event) =>
                                        updateField('email', event.target.value)
                                    }
                                />
                            </div>
                            {renderFieldError('email')}
                        </div>

                        <div className="cg-login__field">
                            {renderLabel('password', 'Password')}
                            <div
                                className="cg-login__control"
                                data-invalid={Boolean(clientErrors.password)}
                            >
                                <input
                                    {...fieldA11yProps('password')}
                                    className="cg-login__input"
                                    type="password"
                                    name="password"
                                    autoComplete="current-password"
                                    value={form.data.password}
                                    onChange={(event) =>
                                        updateField(
                                            'password',
                                            event.target.value,
                                        )
                                    }
                                />
                            </div>
                            {renderFieldError('password')}
                        </div>

                        {demoAccounts.length > 0 && (
                            <div className="cg-login__quickfill">
                                <span>Quick fill:</span>
                                {demoAccounts.map((account) => (
                                    <button
                                        key={account.label}
                                        type="button"
                                        className="cg-login__chip"
                                        aria-label={`Fill in the ${account.label} demo account`}
                                        onClick={() => quickFill(account)}
                                    >
                                        {account.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {canResetPassword && (
                            <div className="cg-login__forgot">
                                <Link
                                    href={request()}
                                    className="cg-login__link"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                        )}

                        {failureMessage && (
                            <p className="cg-login__alert" role="alert">
                                {failureMessage}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="cg-login__submit"
                            disabled={form.processing}
                        >
                            {form.processing ? (
                                <>
                                    <span
                                        className="cg-login__spinner"
                                        aria-hidden="true"
                                    />
                                    Signing in…
                                </>
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </form>

                    {canRegister && (
                        <p className="cg-login__footer">
                            New agency?{' '}
                            <Link href={register()} className="cg-login__link">
                                Create workspace
                            </Link>
                        </p>
                    )}
                </div>
            </main>
        </div>
    );
}
