import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  OPEN_REWARD_CAMPAIGN_EVENT,
  RewardCampaignNotice,
} from '@/components/RewardCampaignNotice';

describe('aviso especial de la ruta de recompensas', () => {
  it('aparece automáticamente para una sesión iniciada y puede cerrarse', () => {
    render(<RewardCampaignNotice initialOpen />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Acceso completo a todas las planchas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('vuelve a abrirse cada vez que se solicita desde la ruta de recompensas', () => {
    render(<RewardCampaignNotice />);

    act(() => window.dispatchEvent(new Event(OPEN_REWARD_CAMPAIGN_EVENT)));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
