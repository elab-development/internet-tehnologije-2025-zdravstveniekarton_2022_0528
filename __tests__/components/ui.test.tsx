import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppointmentStatus, AllergySeverity } from '@prisma/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/appointments/StatusBadge';
import AllergyBadge from '@/components/medical/AllergyBadge';

/**
 * Testovi reusable komponenti.
 *
 * Ne proverava se izgled (boje i razmaci se menjaju), nego PONASANJE:
 * da li se tekst prikaze, da li se onClick pozove, da li onemoguceno dugme
 * zaista ne reaguje. To su stvari koje bi, ako se pokvare, pokvarile i aplikaciju.
 */

describe('Button', () => {
  it('prikazuje prosledjeni tekst', () => {
    render(<Button>Sacuvaj</Button>);
    expect(screen.getByRole('button', { name: 'Sacuvaj' })).toBeInTheDocument();
  });

  it('poziva onClick pri kliku', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Klikni</Button>);

    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('ne reaguje na klik kada je onemoguceno', async () => {
    const handleClick = jest.fn();
    render(
      <Button onClick={handleClick} disabled>
        Klikni
      </Button>,
    );

    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('prikazuje poruku o cekanju i onemoguceno je dok traje slanje', () => {
    render(<Button isLoading>Sacuvaj</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Sacekajte...');
  });

  it('sprecava dvostruko slanje istog zahteva', async () => {
    const handleClick = jest.fn();
    render(
      <Button onClick={handleClick} isLoading>
        Posalji
      </Button>,
    );

    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('primenjuje opasnu varijantu za destruktivne akcije', () => {
    render(<Button variant="danger">Obrisi</Button>);
    expect(screen.getByRole('button').className).toContain('bg-danger-600');
  });
});

describe('Input', () => {
  it('povezuje labelu sa poljem preko htmlFor', () => {
    render(<Input label="Email adresa" name="email" onChange={() => {}} value="" />);
    // getByLabelText pronalazi polje SAMO ako je labela ispravno povezana.
    expect(screen.getByLabelText('Email adresa')).toBeInTheDocument();
  });

  it('prikazuje poruku o gresci', () => {
    render(
      <Input
        label="JMBG"
        name="jmbg"
        value=""
        onChange={() => {}}
        error="JMBG mora imati 13 cifara"
      />,
    );
    expect(screen.getByText('JMBG mora imati 13 cifara')).toBeInTheDocument();
  });

  it('oznacava polje kao neispravno kada postoji greska', () => {
    render(<Input label="JMBG" name="jmbg" value="" onChange={() => {}} error="Greska" />);
    expect(screen.getByLabelText('JMBG')).toHaveAttribute('aria-invalid', 'true');
  });

  it('ne oznacava ispravno polje kao neispravno', () => {
    render(<Input label="JMBG" name="jmbg" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('JMBG')).not.toHaveAttribute('aria-invalid');
  });

  it('prikazuje pomocni tekst kada nema greske', () => {
    render(
      <Input
        label="Lozinka"
        name="password"
        value=""
        onChange={() => {}}
        hint="min. 8 karaktera"
      />,
    );
    expect(screen.getByText('min. 8 karaktera')).toBeInTheDocument();
  });

  it('sakriva pomocni tekst kada postoji greska', () => {
    render(
      <Input
        label="Lozinka"
        name="password"
        value=""
        onChange={() => {}}
        hint="min. 8 karaktera"
        error="Lozinka je prekratka"
      />,
    );
    expect(screen.queryByText('min. 8 karaktera')).not.toBeInTheDocument();
    expect(screen.getByText('Lozinka je prekratka')).toBeInTheDocument();
  });

  it('javlja svaku promenu roditeljskoj komponenti', async () => {
    const handleChange = jest.fn();
    render(<Input label="Ime" name="ime" value="" onChange={handleChange} />);

    await userEvent.type(screen.getByLabelText('Ime'), 'Ana');
    expect(handleChange).toHaveBeenCalledTimes(3); // po jedan poziv za svako slovo
  });
});

describe('Select', () => {
  const options = [
    { value: 'DOCTOR', label: 'Lekar' },
    { value: 'NURSE', label: 'Sestra' },
  ];

  it('prikazuje sve ponudjene opcije', () => {
    render(<Select label="Uloga" name="role" value="" onChange={() => {}} options={options} />);
    expect(screen.getByRole('option', { name: 'Lekar' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Sestra' })).toBeInTheDocument();
  });

  it('dodaje praznu opciju kada je prosledjen placeholder', () => {
    render(
      <Select
        label="Uloga"
        name="role"
        value=""
        onChange={() => {}}
        options={options}
        placeholder="-- izaberite --"
      />,
    );
    expect(screen.getByRole('option', { name: '-- izaberite --' })).toBeInTheDocument();
  });

  it('javlja izbor roditeljskoj komponenti', async () => {
    const handleChange = jest.fn();
    render(<Select label="Uloga" name="role" value="" onChange={handleChange} options={options} />);

    await userEvent.selectOptions(screen.getByLabelText('Uloga'), 'NURSE');
    expect(handleChange).toHaveBeenCalled();
  });
});

describe('Card', () => {
  it('prikazuje sadrzaj', () => {
    render(<Card>Sadrzaj kartice</Card>);
    expect(screen.getByText('Sadrzaj kartice')).toBeInTheDocument();
  });

  it('prikazuje naslov i podnaslov kada su prosledjeni', () => {
    render(
      <Card title="Termini" subtitle="Poslednjih 12 meseci">
        Sadrzaj
      </Card>,
    );
    expect(screen.getByRole('heading', { name: 'Termini' })).toBeInTheDocument();
    expect(screen.getByText('Poslednjih 12 meseci')).toBeInTheDocument();
  });

  it('ne iscrtava zaglavlje kada nema naslova ni akcija', () => {
    render(<Card>Samo sadrzaj</Card>);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('prikazuje akcije u zaglavlju', () => {
    render(
      <Card title="Termin" actions={<button type="button">Otkazi</button>}>
        Sadrzaj
      </Card>,
    );
    expect(screen.getByRole('button', { name: 'Otkazi' })).toBeInTheDocument();
  });
});

describe('Modal', () => {
  it('nije prikazan kada je zatvoren', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Potvrda">
        Sadrzaj
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('prikazuje naslov i sadrzaj kada je otvoren', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Otkazivanje termina">
        Da li ste sigurni?
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Da li ste sigurni?')).toBeInTheDocument();
  });

  it('zatvara se klikom na dugme za zatvaranje', async () => {
    const handleClose = jest.fn();
    render(
      <Modal isOpen onClose={handleClose} title="Potvrda">
        Sadrzaj
      </Modal>,
    );

    await userEvent.click(screen.getByLabelText('Zatvori'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('zatvara se pritiskom na taster Escape', async () => {
    const handleClose = jest.fn();
    render(
      <Modal isOpen onClose={handleClose} title="Potvrda">
        Sadrzaj
      </Modal>,
    );

    await userEvent.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('NE zatvara se klikom unutar prozora', async () => {
    const handleClose = jest.fn();
    render(
      <Modal isOpen onClose={handleClose} title="Potvrda">
        <span>Tekst u modalu</span>
      </Modal>,
    );

    await userEvent.click(screen.getByText('Tekst u modalu'));
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('prikazuje dugmad u podnozju', () => {
    render(
      <Modal
        isOpen
        onClose={() => {}}
        title="Potvrda"
        footer={<button type="button">Potvrdi</button>}
      >
        Sadrzaj
      </Modal>,
    );
    expect(screen.getByRole('button', { name: 'Potvrdi' })).toBeInTheDocument();
  });

  it('zakljucava skrolovanje stranice dok je otvoren', () => {
    const { unmount } = render(
      <Modal isOpen onClose={() => {}} title="Potvrda">
        Sadrzaj
      </Modal>,
    );
    expect(document.body.style.overflow).toBe('hidden');

    // Funkcija ciscenja mora da vrati stranicu u prethodno stanje.
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});

describe('StatusBadge', () => {
  it('prevodi status termina na srpski', () => {
    render(<StatusBadge status={AppointmentStatus.REQUESTED} />);
    expect(screen.getByText('Ceka potvrdu')).toBeInTheDocument();
  });

  it('prikazuje obavljen termin', () => {
    render(<StatusBadge status={AppointmentStatus.COMPLETED} />);
    expect(screen.getByText('Obavljen')).toBeInTheDocument();
  });

  it('koristi crvenu boju za otkazan termin', () => {
    render(<StatusBadge status={AppointmentStatus.CANCELLED} />);
    expect(screen.getByText('Otkazan').className).toContain('danger');
  });
});

describe('AllergyBadge', () => {
  const allergy = {
    id: 'a1',
    allergen: 'Penicilin',
    severity: AllergySeverity.SEVERE,
    notes: 'Jaka kozna reakcija',
  };

  it('prikazuje naziv alergena', () => {
    render(<AllergyBadge allergy={allergy} />);
    expect(screen.getByText('Penicilin')).toBeInTheDocument();
  });

  it('ispisuje tezinu reakcije i recima, ne samo bojom', () => {
    render(<AllergyBadge allergy={allergy} />);
    expect(screen.getByText('(teska)')).toBeInTheDocument();
  });

  it('koristi neutralnu boju za blagu alergiju', () => {
    render(<AllergyBadge allergy={{ ...allergy, severity: AllergySeverity.MILD }} />);
    expect(screen.getByText('Penicilin').parentElement?.className).toContain('slate');
  });
});
