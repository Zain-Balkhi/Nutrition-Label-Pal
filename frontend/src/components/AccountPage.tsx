import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { AuthUser, UserProfile } from '../types';
import './AccountPage.css';

interface AccountPageProps {
  currentUser: AuthUser;
  onUserUpdated: (user: AuthUser) => void;
  onLogout: () => void;
  onAccountDeleted: () => void;
  onDashboardClick: () => void;
}

export default function AccountPage({
  currentUser,
  onUserUpdated,
  onLogout,
  onAccountDeleted,
  onDashboardClick,
}: AccountPageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Name editing
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Recipe count
  const [recipeCount, setRecipeCount] = useState<number>(0);

  // Delete flow: idle → confirm → modal
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'modal'>('idle');
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [profileData, recipes] = await Promise.all([
          api.users.getMe(),
          api.recipes.list(),
        ]);
        if (cancelled) return;
        setProfile(profileData);
        setRecipeCount(recipes.length);
      } catch {
        // Silently fail — user sees loading state
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  function handleEditName() {
    setNameInput(profile?.full_name ?? currentUser.full_name);
    setNameError(null);
    setEditingName(true);
  }

  function handleCancelEdit() {
    setEditingName(false);
    setNameError(null);
  }

  async function handleSaveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError('Name cannot be empty');
      return;
    }
    setSavingName(true);
    setNameError(null);
    try {
      const updated = await api.users.updateMe(trimmed);
      setProfile(prev => prev ? { ...prev, full_name: updated.full_name } : prev);
      onUserUpdated({ ...currentUser, full_name: updated.full_name });
      setEditingName(false);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  }

  function handleDeleteClick() {
    setDeleteStep('confirm');
  }

  function handleConfirmYes() {
    setDeleteStep('modal');
    setDeleteInput('');
    setDeleteError(null);
  }

  function handleConfirmNo() {
    setDeleteStep('idle');
  }

  async function handleDeleteConfirm() {
    if (deleteInput !== 'DELETE') return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.users.deleteMe();
      onAccountDeleted();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account');
      setDeleting(false);
    }
  }

  function formatDate(isoString: string): string {
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  }

  if (loadingProfile) {
    return (
      <div className="account-page">
        <div className="account-loading">Loading account...</div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <h2 className="account-page-title">Account Settings</h2>

      <div className="account-grid">
        {/* ── Left column: Profile ── */}
        <div className="account-card">
          <h3 className="account-card-title">Profile</h3>

          {/* Email (read-only) */}
          <div className="account-field">
            <div className="account-field-label">Email</div>
            <div className="account-field-readonly">
              {profile?.email ?? currentUser.email}
            </div>
          </div>

          {/* Name (view/edit) */}
          <div className="account-field">
            <div className="account-field-label">Name</div>
            {editingName ? (
              <>
                <div className="account-name-edit">
                  <input
                    className="account-name-input"
                    type="text"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); }}
                    autoFocus
                  />
                  <button
                    className="account-save-btn"
                    onClick={handleSaveName}
                    disabled={savingName}
                  >
                    {savingName ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    className="account-cancel-btn"
                    onClick={handleCancelEdit}
                    disabled={savingName}
                  >
                    Cancel
                  </button>
                </div>
                {nameError && <div className="account-name-error">{nameError}</div>}
              </>
            ) : (
              <div className="account-name-display">
                <span className="account-field-value">
                  {profile?.full_name ?? currentUser.full_name}
                </span>
                <button className="account-edit-btn" onClick={handleEditName}>
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Change password placeholder */}
          <div className="account-field">
            <div className="account-field-label">Password</div>
            <div className="account-password-row">
              <button className="account-password-btn" disabled>
                Change Password
              </button>
              <span className="account-coming-soon">Coming Soon</span>
            </div>
          </div>

          <button className="account-logout-btn" onClick={onLogout}>
            Log Out
          </button>
        </div>

        {/* ── Right column: Activity + Danger Zone ── */}
        <div>
          {/* Activity card */}
          <div className="account-card" style={{ marginBottom: '1.5rem' }}>
            <h3 className="account-card-title">Activity</h3>
            <div className="account-stat">
              <div className="account-stat-value">{recipeCount}</div>
              <div className="account-stat-label">
                {recipeCount === 1 ? 'Saved Recipe' : 'Saved Recipes'}
              </div>
              <button className="account-dashboard-link" onClick={onDashboardClick}>
                View Dashboard
              </button>
            </div>
            {profile?.created_at && (
              <div className="account-member-since">
                Member since {formatDate(profile.created_at)}
              </div>
            )}
          </div>

          {/* Danger zone card */}
          <div className="account-card account-danger">
            <h3 className="account-card-title">Danger Zone</h3>
            <p className="account-danger-text">
              Permanently delete your account and all saved recipes. This action cannot be undone.
            </p>

            {deleteStep === 'idle' && (
              <button className="account-delete-btn" onClick={handleDeleteClick}>
                Delete Account
              </button>
            )}

            {deleteStep === 'confirm' && (
              <div className="account-confirm-inline">
                <span className="account-confirm-text">Are you sure?</span>
                <button className="account-confirm-yes" onClick={handleConfirmYes}>
                  Yes
                </button>
                <button className="account-confirm-no" onClick={handleConfirmNo}>
                  No
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteStep === 'modal' && (
        <div className="account-delete-modal-overlay" onClick={() => setDeleteStep('idle')}>
          <div className="account-delete-modal" onClick={e => e.stopPropagation()}>
            <h3 className="account-delete-modal-title">Delete Your Account</h3>
            <p className="account-delete-modal-text">
              This will permanently delete your account and all {recipeCount} saved{' '}
              {recipeCount === 1 ? 'recipe' : 'recipes'}. Type <strong>DELETE</strong> to confirm.
            </p>
            {deleteError && <div className="account-delete-error">{deleteError}</div>}
            <input
              className="account-delete-modal-input"
              type="text"
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder='Type "DELETE" to confirm'
              autoFocus
            />
            <div className="account-delete-modal-actions">
              <button
                className="account-cancel-btn"
                onClick={() => setDeleteStep('idle')}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="account-delete-btn"
                onClick={handleDeleteConfirm}
                disabled={deleteInput !== 'DELETE' || deleting}
              >
                {deleting ? 'Deleting...' : 'Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
