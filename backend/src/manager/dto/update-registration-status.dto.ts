import { IsEnum } from 'class-validator';
import { RegistrationStatus } from '../../events/enums';

export class UpdateRegistrationStatusDto {
    @IsEnum(RegistrationStatus)
    status: RegistrationStatus;
}
